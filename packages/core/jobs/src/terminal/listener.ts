import { getLogger } from "@damatjs/logger";
import type { ClaimedJobRun } from "../worker/types";
import { pipelineJobBinding } from "./binding";
import type { JobTerminalListener, JobTerminalStatus } from "./types";

let listener: JobTerminalListener | undefined;

export const configureJobTerminalListener = (value: JobTerminalListener) => {
  listener = value;
};
export const clearJobTerminalListener = () => {
  listener = undefined;
};

export async function notifyJobTerminal(
  claim: ClaimedJobRun,
  status: JobTerminalStatus,
): Promise<void> {
  const binding = pipelineJobBinding(claim.metadata);
  if (!binding || !listener) return;
  try {
    await listener(binding, status);
  } catch (error) {
    getLogger().warn("Job terminal wake-up failed", { error: String(error) });
  }
}
