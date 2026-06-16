import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    storage: HealthCheck;
  };
}

/**
 * Readiness probe - checks if the application is ready to serve traffic
 * Used by load balancers and orchestrators to determine if traffic should be routed
 * Checks all critical dependencies (database, cache, storage)
 */
export async function GET() {
  const checks: HealthReport['checks'] = {
    database: { status: 'unhealthy' },
    redis: { status: 'unhealthy' },
    storage: { status: 'unhealthy' },
  };

  let overallStatus: HealthReport['status'] = 'healthy';

  // Check database
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: process.env.NODE_ENV === 'production'
        ? 'Service unavailable'
        : (error instanceof Error ? error.message : 'Unknown error'),
    };
    overallStatus = 'unhealthy';
  }

  // Check Redis (if configured)
  if (redis) {
    try {
      const start = Date.now();
      await redis.ping();
      checks.redis = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error: process.env.NODE_ENV === 'production'
          ? 'Service unavailable'
          : (error instanceof Error ? error.message : 'Unknown error'),
      };
      // Redis failure degrades but doesn't fail readiness (unless rate limiting is critical)
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }
  } else {
    // Redis not configured - mark as healthy (optional dependency)
    checks.redis = {
      status: 'healthy',
      error: 'Not configured (optional)',
    };
  }

  // Check storage (S3 or local)
  try {
    const start = Date.now();
    const s3Enabled = !!(
      process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
    );

    if (s3Enabled) {
      // Test S3 connectivity with a head request
      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: process.env.S3_REGION!,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      });
      await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET! }));
      checks.storage = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } else {
      // Local storage - just check if uploads directory is writable
      const fs = await import('fs/promises');
      const path = await import('path');
      const testDir = path.join(process.cwd(), 'uploads', '.health-check');
      await fs.mkdir(testDir, { recursive: true });
      await fs.rmdir(testDir);
      checks.storage = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    }
  } catch (error) {
    checks.storage = {
      status: 'unhealthy',
      error: process.env.NODE_ENV === 'production'
        ? 'Service unavailable'
        : (error instanceof Error ? error.message : 'Unknown error'),
    };
    // Storage failure degrades but doesn't fail readiness
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  // In production, return generic status without details when unhealthy
  if (process.env.NODE_ENV === 'production' && overallStatus === 'unhealthy') {
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: statusCode }
    );
  }

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    } as HealthReport,
    { status: statusCode }
  );
}
