import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness probe - returns 200 if the application is running
 * Used by Kubernetes/container orchestrators to determine if app should be restarted
 * Should NOT check dependencies - only confirms the process is alive
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
