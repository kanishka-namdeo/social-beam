import { NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Create a standardized error response with correlation ID for support references.
 * 
 * @param message - User-friendly error message
 * @param status - HTTP status code
 * @param correlationId - Optional correlation ID (generated if not provided)
 * @param context - Optional context for logging (not exposed to client)
 */
export function createErrorResponse(
  message: string,
  status: number,
  correlationId?: string,
  context?: Record<string, unknown>
): NextResponse {
  const errorId = correlationId ?? crypto.randomUUID();

  // Log the error with full context for debugging
  logger.error('api.error.response', {
    errorId,
    message,
    status,
    ...context,
  });

  // Return sanitized response to client
  return NextResponse.json(
    {
      error: message,
      errorId,
    },
    { status }
  );
}

/**
 * Create a 500 Internal Server Error response with correlation ID.
 * Hides internal error details from the client while providing a reference ID.
 */
export function createInternalErrorResponse(
  correlationId?: string,
  context?: Record<string, unknown>
): NextResponse {
  return createErrorResponse(
    'Internal server error',
    500,
    correlationId,
    context
  );
}
