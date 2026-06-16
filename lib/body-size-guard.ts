import { NextResponse } from 'next/server';
import { logger } from './logger';

const DEFAULT_MAX_BODY_SIZE = 1024 * 1024; // 1MB
const MEDIA_MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

const MEDIA_ROUTES = [
  '/api/compose',
  '/api/campaigns',
  '/api/media',
  '/api/upload',
];

export function checkBodySize(
  request: Request,
  customLimit?: number
): NextResponse | null {
  const contentLength = request.headers.get('content-length');
  
  if (!contentLength) {
    return null; // No content-length header, allow (chunked transfer)
  }

  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
    return NextResponse.json(
      { error: 'Invalid Content-Length header' },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const isMediaRoute = MEDIA_ROUTES.some(route => url.pathname.startsWith(route));
  const maxBodySize = customLimit ?? (isMediaRoute ? MEDIA_MAX_BODY_SIZE : DEFAULT_MAX_BODY_SIZE);

  if (size > maxBodySize) {
    logger.warn('body_size.exceeded', {
      path: url.pathname,
      size,
      maxBodySize,
      isMediaRoute,
    });

    const maxMB = Math.round(maxBodySize / (1024 * 1024));
    return NextResponse.json(
      { error: `Request body too large. Maximum size is ${maxMB}MB` },
      { status: 413 }
    );
  }

  return null;
}
