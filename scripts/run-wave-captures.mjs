import { spawn } from "node:child_process";
import path from "node:path";

const child = spawn(
  process.execPath,
  [
    path.resolve("node_modules", "@playwright", "test", "cli.js"),
    "test",
    "atlas/tests/wave001-capture.e2e.spec.ts",
  ],
  {
    env: { ...process.env, UPDATE_WAVE_001_CAPTURES: "1" },
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
