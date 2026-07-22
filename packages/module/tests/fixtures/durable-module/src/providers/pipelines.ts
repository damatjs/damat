import { definePipeline, registerPipelineJob } from "@damatjs/pipelines";

registerPipelineJob({ name: "standalone.fixture.echo" });
definePipeline("standalone.fixture.pipeline", {
  version: 1,
  start: "echo",
  nodes: [
    {
      id: "echo",
      kind: "job",
      name: "standalone.fixture.echo",
      input: { $ref: "input" },
    },
  ],
  edges: [],
});
