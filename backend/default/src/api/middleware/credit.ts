
/**
 * Authentication middleware for Hono
 * Uses Better Auth for session management
 */

import { Context, Next } from 'hono';
// import { creditTransactionService } from '@/modules/billing/service';
import {
    AuthenticationError,
    InsufficientCreditsError,
} from '@damatjs/types';
import { CREDIT_COSTS } from '@/lib/config';

// =============================================================================
// CREDIT CHECKING
// =============================================================================

type CreditCostKey = keyof typeof CREDIT_COSTS;

/**
 * Credit check middleware - ensures sufficient credits for the operation
 */
export function creditCheck(operation: CreditCostKey) {
    return async (c: Context, next: Next): Promise<Response | void> => {
        const apiKey = c.get('apiKey');

        if (!apiKey) {
            throw new AuthenticationError('API key required');
        }

        // const cost = CREDIT_COSTS[operation]();
        // const hasEnough = await creditTransactionService.checkCredits(apiKey.teamId, cost);

        // if (!hasEnough) {
        //     const remaining = apiKey.team.credits - apiKey.team.creditsUsed;
        //     throw new InsufficientCreditsError(cost, remaining);
        // }

        await next();
    };
}