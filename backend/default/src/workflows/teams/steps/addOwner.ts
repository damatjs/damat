/**
 * Add Owner Member Step
 *
 * Adds the creating user as the team owner
 */

import { createStep, RetryPolicies } from "@damatjs/workflow-engine";
import { getTeamMemberService } from "@/lib/services";
import { logger } from "@/lib/logger";
import { TeamRole } from "@/modules/teams/models";
import type { CreateTeamStepOutput, AddOwnerStepOutput } from "../types";

/**
 * Adds the creating user as the team owner
 * Includes compensation to remove the membership if subsequent steps fail
 */
export const addOwnerMemberStep = createStep<
  CreateTeamStepOutput,
  AddOwnerStepOutput
>(
  "add-owner-member",
  async ({ input, team }) => {
    const teamMemberService = await getTeamMemberService();
    const membership = await teamMemberService.create({
      team: team,
      userId: input.userId,
      role: TeamRole.OWNER,
      acceptedAt: new Date(),
    });

    return { input, team, membership };
  },
  async ({ input, team }, _output, ctx) => {
    // Compensation: remove the membership
    const stepLogger = logger.child({
      workflow: ctx.workflowName,
      step: "add-owner-member",
      executionId: ctx.executionId,
    });

    stepLogger.info(`Rolling back owner membership`, {
      teamId: team.id,
      userId: input.userId,
    });

    const teamMemberService = await getTeamMemberService();
    await teamMemberService.removeMember(team.id, input.userId);
  },
  {
    description: "Add user as team owner",
    timeoutMs: 10000,
    retry: RetryPolicies.once,
  },
);
