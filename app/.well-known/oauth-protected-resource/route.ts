export async function GET() {
  return Response.json({
    resource: `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`,
    authorization_servers: [process.env.NEXT_PUBLIC_APP_URL],
    bearer_methods_supported: ['header'],
    scopes_supported: [
      'mcp:compose',
      'mcp:analytics',
      'mcp:brand',
      'mcp:inbox',
      'mcp:publish',
      'mcp:reddit',
      'mcp:accounts',
    ],
  });
}
