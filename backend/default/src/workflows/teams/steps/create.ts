/**
 * Create Team Step
 *
 * Creates the team record in the database
 */

import { createStep, RetryPolicies } from "@damatjs/workflow-engine";
import { getTeamService } from "@/lib/services";
import { getModuleConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { ValidateSlugStepOutput, CreateTeamStepOutput } from "../types";

/**
 * Creates the team record
 * Includes compensation to delete the team if subsequent steps fail
 */
export const createTeamStep = createStep<
  ValidateSlugStepOutput,
  CreateTeamStepOutput
>(
  "create-team",
  async ({ input }) => {
    const teamService = await getTeamService();
    const config = getModuleConfig();

    const team = await teamService.create({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      credits: input.defaultCredits ?? config.defaultTeamCredits ?? 1000,
    });

    return { input, team };
  },
  async ({ input }, { team }, ctx) => {
    // Compensation: delete the created team
    if (team?.id) {
      const stepLogger = logger.child({
        workflow: ctx.workflowName,
        step: "create-team",
        executionId: ctx.executionId,
      });

      stepLogger.info(`Rolling back team creation`, {
        teamId: team.id,
        slug: input.slug,
      });

      const teamService = await getTeamService();
      await teamService.delete(team.id);
    }
  },
  {
    description: "Create team record in database",
    timeoutMs: 10000,
    retry: RetryPolicies.once, // Retry once for transient DB errors
  },
);
