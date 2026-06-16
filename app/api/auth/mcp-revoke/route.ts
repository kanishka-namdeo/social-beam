import { revokeToken } from '@/lib/mcp/token-revocation';

export async function POST(req: Request) {
  const body = await req.formData();
  const token = body.get('token');

  if (!token) {
    return Response.json(
      { error: 'invalid_request', error_description: 'Missing token parameter' },
      { status: 400 }
    );
  }

  await revokeToken(token as string);

  return Response.json({ status: 'ok' });
}
