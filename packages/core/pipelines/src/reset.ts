import {
  clearPipelineCapabilities,
  clearPipelineDefaults,
  clearPipelineDefinitions,
} from "./definitions";
import { clearPipelineWakeupPublisher } from "./wakeup";

export function clearPipelineRuntime(): void {
  clearPipelineDefinitions();
  clearPipelineCapabilities();
  clearPipelineRuntimeBindings();
}

export function clearPipelineRuntimeBindings(): void {
  clearPipelineDefaults();
  clearPipelineWakeupPublisher();
}
