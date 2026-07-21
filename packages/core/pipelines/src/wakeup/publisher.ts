import { PIPELINE_WAKEUP_CHANNEL, type PipelineWakeupPublisher } from "./types";

let publisher: PipelineWakeupPublisher | undefined;

export const configurePipelineWakeupPublisher = (
  value: PipelineWakeupPublisher,
) => {
  publisher = value;
};
export const clearPipelineWakeupPublisher = () => {
  publisher = undefined;
};

export async function publishPipelineWakeup(scope?: string): Promise<void> {
  if (!publisher) return;
  await publisher.publish(
    PIPELINE_WAKEUP_CHANNEL,
    JSON.stringify({ kind: "pipelines", ...(scope ? { scope } : {}) }),
  );
}
