/**
 * Authentication middleware for Hono
 * Uses Better Auth for session management
 */

import { Context, Next } from "@damatjs/deps/hono";
import { nanoid } from '@damatjs/deps/nanoid';
import { getLogger } from '@damatjs/logger';

const logger = getLogger();

// =============================================================================
// REQUEST SETUP MIDDLEWARE
// =============================================================================

/**
 * Add request ID and timing to context
 */
export async function requestSetup(c: Context, next: Next): Promise<Response | void> {
  c.set('requestId', nanoid(12));
  c.set('startTime', Date.now());

  const requestLogger = logger.child({
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
  });

  c.set('logger', requestLogger);

  requestLogger.debug('Request started', {
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    query: c.req.query(),
  });

  await next();

  const duration = Date.now() - c.get('startTime');
  const status = c.res.status;

  logger.request({
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status,
    duration,
    identifier: [
      { label: 'userId', value: c.get('user')?.id || 'anonymous' },
      { label: 'teamId', value: c.get('team')?.id || 'none' },
    ],
  });

  c.header('X-Request-ID', c.get('requestId'));
  c.header('X-Response-Time', `${duration}ms`);
}
