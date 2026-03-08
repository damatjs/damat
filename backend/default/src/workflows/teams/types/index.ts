/**
 * Team Workflow Types
 *
 * Defines all input/output types for team-related workflows and steps
 */

import type { Team, TeamMember } from "@/modules/teams/models";

// =============================================================================
// CREATE TEAM WORKFLOW
// =============================================================================

/**
 * Input for the create team workflow
 */
export interface CreateTeamWorkflowInput {
  /** User ID who will be the team owner */
  userId: string;
  /** Display name for the team */
  name: string;
  /** URL-friendly slug (must be unique) */
  slug: string;
  /** Optional team description */
  description?: string;
  /** Initial credits allocation (defaults to config value) */
  defaultCredits?: number;
}

/**
 * Output from the create team workflow
 */
export interface CreateTeamWorkflowOutput {
  /** The created team */
  team: Team;
  /** The owner membership record */
  membership: TeamMember;
}

// =============================================================================
// STEP INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Output from the validate slug step
 */
export interface ValidateSlugStepOutput {
  /** Original input, validated */
  input: CreateTeamWorkflowInput;
  /** Indicates slug is available */
  slugAvailable: true;
}

/**
 * Output from the create team step
 */
export interface CreateTeamStepOutput {
  /** Original input */
  input: CreateTeamWorkflowInput;
  /** Created team record */
  team: Team;
}

/**
 * Output from the add owner step
 */
export interface AddOwnerStepOutput {
  /** Original input */
  input: CreateTeamWorkflowInput;
  /** Created team record */
  team: Team;
  /** Created membership record */
  membership: TeamMember;
}
