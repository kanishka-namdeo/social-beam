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

  const { id } = await params;

  const existing = await prisma.scraperProcess.findFirst({
    where: { id, workspaceId },
  });

  if (!existing) {
    return new Response(sseEvent("error", { message: "Process not found" }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const runningProcess = processRegistry.getByProcessId(id);

  // If the process is no longer running, send final state and close
  if (!runningProcess) {
    const body =
      sseEvent("status-change", { status: existing.status }) +
      sseEvent("complete", {});
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Live SSE stream for running process
  const encoder = new TextEncoder();
  let lastProgress = existing.progress;
  let lastCurrentStep: string | null = existing.currentStep ?? null;
  let lastStatus: ProcessStatus = existing.status;
  let lastLogIndex = 0;
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

      // Initial state
      send("status-change", { status: existing.status });
      if (existing.progress > 0 || existing.currentStep) {
        send("progress", {
          progress: existing.progress,
          currentStep: existing.currentStep,
        });
      }

      // Subscribe to log entries for this process
      const unsubscribeLogs = processLogStore.subscribe(id, (entry) => {
        lastLogIndex++;
        send("log", {
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp,
        });
      });

      // Poll DB for progress/status changes
      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval);
          unsubscribeLogs();
          return;
        }

        try {
          const current = await prisma.scraperProcess.findUnique({
            where: { id },
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
            current.currentStep !== lastCurrentStep
          ) {
            lastProgress = current.progress;
            lastCurrentStep = current.currentStep;
            send("progress", {
              progress: current.progress,
              currentStep: current.currentStep,
            });
          }

          // Terminal states: close the stream
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
            send("complete", {});
            cleanup();
          }
        } catch (err) {
          logger.error("api.processes.stream.poll.error", { processId: id, error: String(err) });
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

      // Handle client disconnect
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
