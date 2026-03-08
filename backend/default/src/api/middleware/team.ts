
/**
 * Authentication middleware for Hono
 * Uses Better Auth for session management
 */

import { Context, Next } from 'hono';
// import { teamService, checkTeamAccess } from '@/modules/teams/service';
// import type { TeamRole } from '@damatjs/types';
import {
    AuthenticationError,
    AuthorizationError,
} from '@damatjs/types';


// =============================================================================
// TEAM ACCESS CONTROL
// =============================================================================

/**
 * Team access middleware - validates user has access to the team
 */
export function requireTeamAccess(requiredRoles?: any[]) {
    return async (c: Context, next: Next): Promise<Response | void> => {
        const user = c.get('user');
        const teamId = c.req.param('teamId');

        if (!user) {
            throw new AuthenticationError('Authentication required');
        }

        if (!teamId) {
            throw new AuthorizationError('Team ID required');
        }

        // const role = await checkTeamAccess(user.id, teamId, requiredRoles);

        // const team = await teamService.getTeamById(teamId);
        // if (!team) {
        //     throw new AuthorizationError('Team not found');
        // }

        // c.set('team', team);
        // c.set('teamRole', role);

        await next();
    };
}