/**
 * /api/v1/webhooks/:teamId/:webhookId
 * Single webhook operations (get, update, delete)
 */

import { Context } from '@damatjs/deps/hono';
import { z } from '@damatjs/deps/zod';
// import { getWebhookById, updateWebhook, deleteWebhook } from '@/modules/webhook/service';
import { sessionAuth, requireTeamAccess } from '@/api/middleware';
import { validate } from '@/api/middleware/error';
// import { canManageTeam } from '@/modules/teams/utils';

// =============================================================================
// MIDDLEWARE
// =============================================================================

export const middleware = [sessionAuth, requireTeamAccess()];

// =============================================================================
// SCHEMAS
// =============================================================================

const updateWebhookSchema = z.object({
    url: z.string().url().optional(),
    events: z.array(z.enum([
        'usage_threshold_reached',
        'usage_limit_exceeded',
        'credits_low',
        'credits_depleted',
        'credits_purchased',
        'invoice_created',
        'invoice_paid',
        'invoice_failed',
        'subscription_created',
        'subscription_updated',
        'subscription_cancelled',
        'member_invited',
        'member_joined',
        'member_removed',
        'api_key_created',
        'api_key_revoked',
    ])).min(1).optional(),
    isActive: z.boolean().optional(),
});

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/v1/webhooks/:teamId/:webhookId
 * Get webhook details
 */
export async function GET(c: Context) {
    const teamId = c.req.param('teamId');
    const webhookId = c.req.param('webhookId');

    // const webhook = await getWebhookById(webhookId);
    // 
    // if (!webhook || webhook.teamId !== teamId) {
    //     throw new NotFoundError('Webhook');
    // }

    return c.json({
        success: true,
        data: {
            // webhook,
        },
    });
}

/**
 * PATCH /api/v1/webhooks/:teamId/:webhookId
 * Update a webhook
 */
export async function PATCH(c: Context) {
    const teamId = c.req.param('teamId');
    const webhookId = c.req.param('webhookId');
    const role = c.get('teamRole')!;

    // if (!canManageTeam(role)) {
    //     throw new AuthorizationError('You do not have permission to update webhooks');
    // }

    // const existing = await getWebhookById(webhookId);
    // if (!existing || existing.teamId !== teamId) {
    //     throw new NotFoundError('Webhook');
    // }

    const body = await c.req.json();
    const input = validate(updateWebhookSchema, body);

    // const webhook = await updateWebhook(webhookId, input as any);

    return c.json({
        success: true,
        data: {
            // webhook,
        },
    });
}

/**
 * DELETE /api/v1/webhooks/:teamId/:webhookId
 * Delete a webhook
 */
export async function DELETE(c: Context) {
    const teamId = c.req.param('teamId');
    const webhookId = c.req.param('webhookId');
    const role = c.get('teamRole')!;

    // if (!canManageTeam(role)) {
    //     throw new AuthorizationError('You do not have permission to delete webhooks');
    // }

    // const existing = await getWebhookById(webhookId);
    // if (!existing || existing.teamId !== teamId) {
    //     throw new NotFoundError('Webhook');
    // }

    // await deleteWebhook(webhookId);

    return c.json({
        success: true,
        message: 'Webhook deleted successfully',
    });
}
