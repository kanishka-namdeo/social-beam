import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { processRegistry } from "@/lib/processes/process-registry";
import { processLogStore } from "@/lib/processes/process-log-store";
import type { ProcessStatus } from "@/app/generated/prisma";

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response(sseEvent("error", { message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
  if (!workspaceId) {
    return new Response(sseEvent("error", { message: "No workspace" }), {
      status: 401,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const { id: activityLogId } = await params;

  const activityLog = await prisma.activityLog.findFirst({
    where: { id: activityLogId, workspaceId },
  });

  if (!activityLog) {
    return new Response(sseEvent("error", { message: "Activity log not found" }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const process = await prisma.scraperProcess.findFirst({
    where: {
      workspaceId,
      metadata: { path: ["activityLogId"], equals: activityLogId },
    },
  });

  if (!process) {
    const body =
      sseEvent("status-change", { status: activityLog.status }) +
      sseEvent("complete", { hasProcess: false });
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const processId = process.id;
  const runningProcess = processRegistry.getByProcessId(processId);

  if (!runningProcess) {
    const body =
      sseEvent("status-change", { status: process.status }) +
      sseEvent("progress", {
        progress: process.progress,
        currentStep: process.currentStep,
        postsFound: process.postsFound,
        postsProcessed: process.postsProcessed,
      }) +
      sseEvent("complete", { processId });
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const encoder = new TextEncoder();
  let lastProgress = process.progress;
  let lastCurrentStep: string | null = process.currentStep ?? null;
  let lastStatus: ProcessStatus = process.status;
  let lastPostsFound = process.postsFound;
  let lastPostsProcessed = process.postsProcessed;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          closed = true;
        }
      };

      send("status-change", { status: process.status, processId });
      if (process.progress > 0 || process.currentStep) {
        send("progress", {
          progress: process.progress,
          currentStep: process.currentStep,
          postsFound: process.postsFound,
          postsProcessed: process.postsProcessed,
        });
      }

      const unsubscribeLogs = processLogStore.subscribe(processId, (entry) => {
        send("log", {
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp,
        });
      });

      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval);
          unsubscribeLogs();
          return;
        }

        try {
          const current = await prisma.scraperProcess.findUnique({
            where: { id: processId },
          });

          if (!current) {
            send("error", { message: "Process record disappeared" });
            send("complete", {});
            cleanup();
            return;
          }

          if (current.status !== lastStatus) {
            lastStatus = current.status;
            send("status-change", { status: current.status });
          }

          if (
            current.progress !== lastProgress ||
            current.currentStep !== lastCurrentStep ||
            current.postsFound !== lastPostsFound ||
            current.postsProcessed !== lastPostsProcessed
          ) {
            lastProgress = current.progress;
            lastCurrentStep = current.currentStep;
            lastPostsFound = current.postsFound;
            lastPostsProcessed = current.postsProcessed;
            send("progress", {
              progress: current.progress,
              currentStep: current.currentStep,
              postsFound: current.postsFound,
              postsProcessed: current.postsProcessed,
            });
          }

          if (
            current.status === "COMPLETED" ||
            current.status === "FAILED" ||
            current.status === "CANCELLED" ||
            current.status === "ORPHANED"
          ) {
            if (current.status === "FAILED") {
              send("error", {
                message: current.error ?? "Process failed",
              });
            }
            send("complete", { processId });
            cleanup();
          }
        } catch (err) {
          logger.error("SSE poll error (activity stream)", { error: err instanceof Error ? err.message : String(err), activityLogId });
        }
      }, 1000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(pollInterval);
        unsubscribeLogs();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", () => {
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
