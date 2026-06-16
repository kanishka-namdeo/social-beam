import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer, mcpContext } from '@/lib/mcp/server';
import { verifyMcpToken, McpAuthError } from '@/lib/mcp/auth';
import { checkRateLimit } from '@/lib/mcp/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const WELL_KNOWN_URL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/.well-known/oauth-protected-resource`;

function unauthorizedResponse(message: string): Response {
  return new Response(
    JSON.stringify({ error: 'unauthorized', error_description: message }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer resource_metadata="${WELL_KNOWN_URL}"`,
      },
    }
  );
}

async function handleMcpRequest(req: Request): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyMcpToken(req);
  } catch (error) {
    if (error instanceof McpAuthError) {
      return unauthorizedResponse(error.message);
    }
    return unauthorizedResponse('Authentication failed');
  }

  if (!await checkRateLimit(ctx.userId)) {
    return new Response(
      JSON.stringify({ error: 'rate_limit_exceeded', error_description: 'Too many requests. Limit is 100 per minute.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
    );
  }

  const server = createMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  return mcpContext.run(ctx, () => transport.handleRequest(req));
}

export async function POST(req: Request): Promise<Response> {
  return handleMcpRequest(req);
}

export async function GET(req: Request): Promise<Response> {
  return handleMcpRequest(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return handleMcpRequest(req);
}
