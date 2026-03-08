/**
 * Validate Slug Step
 *
 * Validates that the requested team slug is available
 */

import { createStep } from "@damatjs/workflow-engine";
import { getTeamService } from "@/lib/services";
import type { CreateTeamWorkflowInput, ValidateSlugStepOutput } from "../types";
import { ValidationError } from "@damatjs/types";

/**
 * Validates that the requested slug is not already taken
 * This step has no compensation as it's a read-only check
 */
export const validateSlugStep = createStep<
  CreateTeamWorkflowInput,
  ValidateSlugStepOutput
>(
  "validate-slug",
  async (input) => {
    const teamService = await getTeamService();
    const existing = await teamService.findBySlug(input.slug);
    if (existing) {
      throw new ValidationError("Team slug already taken", {
        slug: input.slug,
      });
    }
    return {
      input,
      slugAvailable: true,
    };
  },
  undefined, // No compensation for read-only validation
  {
    description: "Validate team slug availability",
    timeoutMs: 5000,
    // Don't retry validation - it's idempotent and fast
    retry: { maxAttempts: 0 },
  },
);
