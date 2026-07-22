import { assertServerPortAvailable, startModuleApp } from "../../../src";

const running = await startModuleApp({ packageDir: import.meta.dir, port: 0 });
let health = 0;
try {
  health = await fetch(`http://127.0.0.1:${running.port}/health`).then(
    (response) => response.status,
  );
} finally {
  await running.stop();
}
await assertServerPortAvailable(running.port, "127.0.0.1");
console.log(
  `PRODUCER_EVENT_RESULT=${JSON.stringify({ health, portReleased: true })}`,
);
