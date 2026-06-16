import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processLogStore } from '@/lib/processes/process-log-store';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return new Response('Missing jobId', { status: 400 });
  }

  const process = await prisma.scraperProcess.findUnique({
    where: { id: jobId },
  });

  if (!process) {
    return new Response('Process not found', { status: 404 });
  }

  // Verify ownership — users can only view logs for processes in their workspace
  const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
  if (process.workspaceId !== workspaceId) {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const history = processLogStore.getHistory(jobId);
      for (const entry of history) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
      }

      const isTerminal = process.status === 'COMPLETED' || 
                         process.status === 'FAILED' || 
                         process.status === 'CANCELLED' || 
                         process.status === 'ORPHANED';

      if (isTerminal) {
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
        return;
      }

      let cleanedUp = false;
      const heartbeat = setInterval(() => {
        if (cleanedUp) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);

      const unsubscribe = processLogStore.subscribe(jobId, (entry) => {
        if (cleanedUp) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
        } catch {
          cleanup();
        }
      });

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };

      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
