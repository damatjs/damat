// This is for admin based controlled to get any data and act in full authority not full setup

/**
 * Authentication middleware for Hono
 * Uses Better Auth for session management
 */

import { Context, Next } from 'hono';
import { AuthorizationError } from '@damatjs/types';


// =============================================================================
// ADMIN AUTHENTICATION
// =============================================================================

/**
 * Admin authentication middleware (legacy - for backward compatibility)
 */
export async function adminAuth(c: Context, next: Next): Promise<Response | void> {
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret = c.req.header('X-Admin-Secret');

    if (!adminSecret) {
        throw new AuthorizationError('Admin endpoints not configured');
    }

    if (providedSecret !== adminSecret) {
        throw new AuthorizationError('Invalid admin credentials');
    }

    await next();
}
