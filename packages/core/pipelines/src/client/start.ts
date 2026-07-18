import {
  getDurabilityClient,
  isTransactionalExecutor,
  TransactionalExecutorRequiredError,
} from "@damatjs/durability";
import {
  validatePipelineSchema,
  type PipelineInput,
  type PipelineName,
} from "../definitions";
import { findActivePipelineVersion } from "../repositories";
import { publishPipelineWakeup } from "../wakeup";
import { insertPipelineRun } from "./insert-run";
import type { StartPipelineOptions } from "./start-types";

export async function startPipeline<K extends PipelineName>(
  name: K,
  input: PipelineInput<K>,
  options: StartPipelineOptions = {},
) {
  if (!name.trim()) throw new Error("Pipeline name is required");
  if (Boolean(options.parentRunId) !== Boolean(options.parentNodeExecutionId)) {
    throw new Error(
      "parentRunId and parentNodeExecutionId must be supplied together",
    );
  }
  if (options.executor) {
    if (!isTransactionalExecutor(options.executor))
      throw new TransactionalExecutorRequiredError();
    return startWith(options.executor, name, input, options);
  }
  const run = await getDurabilityClient().transaction((executor) =>
    startWith(executor, name, input, options),
  );
  await publishPipelineWakeup(name);
  return run;
}

async function startWith(
  executor: Parameters<typeof findActivePipelineVersion>[0],
  name: string,
  input: unknown,
  options: StartPipelineOptions,
) {
  const version = await findActivePipelineVersion(
    executor,
    name,
    options.versionId,
  );
  if (!version) throw new Error(`Published pipeline "${name}" was not found`);
  validatePipelineSchema(
    input,
    version.manifest.inputSchema,
    `pipeline.${name}.input`,
  );
  const run = await insertPipelineRun(executor, version, input, options);
  if (!run) throw new Error("Pipeline idempotency conflict has no run");
  return run;
}
