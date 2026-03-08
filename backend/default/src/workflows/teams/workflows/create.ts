/**
 * Create Team Workflow
 *
 * Orchestrates the creation of a new team with automatic rollback on failure
 *
 * Steps:
 * 1. Validate slug availability
 * 2. Create team record
 * 3. Add creating user as owner
 */

import { createWorkflow, runStep } from "@damatjs/workflow-engine";
import { Effect } from "effect";
import { validateSlugStep } from "../steps/validate";
import { createTeamStep } from "../steps/create";
import { addOwnerMemberStep } from "../steps/addOwner";
import type { CreateTeamWorkflowInput, CreateTeamWorkflowOutput } from "../types";

/**
 * Creates a new team with the specified user as owner
 *
 * This workflow automatically handles rollback if any step fails:
 * - If addOwnerMember fails, the team creation is rolled back
 * - If createTeam fails, no cleanup needed (nothing was created yet)
 *
 * @example
 * ```typescript
 * const result = await createTeamWorkflow.execute({
 *   userId: "user-123",
 *   name: "My Team",
 *   slug: "my-team",
 *   description: "A great team",
 * });
 *
 * if (result.success) {
 *   console.log("Team created:", result.result.team);
 * } else {
 *   console.error("Failed:", result.error);
 * }
 * ```
 */
export const createTeamWorkflow = createWorkflow<CreateTeamWorkflowInput, CreateTeamWorkflowOutput>(
    "create-team",
    (input, ctx) =>
        Effect.gen(function* (_) {
            // Step 1: Validate slug availability
            const validated = yield* runStep(validateSlugStep, input, ctx);

            // Step 2: Create team record
            // Compensation registered: deletes team if later steps fail
            const created = yield* runStep(createTeamStep, validated, ctx);

            // Step 3: Add owner membership
            // Compensation registered: removes membership if later steps fail
            const result = yield* runStep(addOwnerMemberStep, created, ctx);

            return {
                team: result.team,
                membership: result.membership,
            };
        }),
    {
        // 60 second timeout for entire workflow
        timeoutMs: 60_000,
    }
);
