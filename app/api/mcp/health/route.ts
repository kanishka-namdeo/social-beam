import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * MCP health check — verifies the MCP server can actually serve requests.
 * Checks database connectivity (required for MCP user/scope lookups)
 * and confirms the MCP server module loads correctly.
 */
export async function GET() {
  const checks: Record<string, { status: string; error?: string }> = {};
  let healthy = true;

  // Check database (MCP needs DB for user/scope resolution)
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (error) {
    checks.database = {
      status: 'fail',
      error: error instanceof Error ? error.message : 'Database unreachable',
    };
    healthy = false;
  }

  // Check MCP server module loads
  try {
    const { createMcpServer } = await import('@/lib/mcp/server');
    if (typeof createMcpServer !== 'function') {
      throw new Error('createMcpServer is not a function');
    }
    checks.mcp_server = { status: 'ok' };
  } catch (error) {
    checks.mcp_server = {
      status: 'fail',
      error: error instanceof Error ? error.message : 'MCP server module failed to load',
    };
    healthy = false;
  }

  // Check MCP JWT secret is configured
  if (!process.env.MCP_JWT_SECRET) {
    checks.mcp_jwt = { status: 'fail', error: 'MCP_JWT_SECRET not configured' };
    healthy = false;
  } else {
    checks.mcp_jwt = { status: 'ok' };
  }

  return Response.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'social-beam-mcp',
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
