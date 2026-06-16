export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return Response.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/mcp-authorize`,
    token_endpoint: `${baseUrl}/api/auth/mcp-token`,
    revocation_endpoint: `${baseUrl}/api/auth/mcp-revoke`,
    registration_endpoint: `${baseUrl}/api/auth/mcp-register`,
    scopes_supported: [
      'mcp:compose',
      'mcp:analytics',
      'mcp:brand',
      'mcp:inbox',
      'mcp:publish',
      'mcp:reddit',
      'mcp:accounts',
    ],
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
  });
}
