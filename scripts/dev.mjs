import { spawn } from "node:child_process";

const children = [
  spawn(process.execPath, ["server/index.mjs"], { stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"], { stdio: "inherit" }),
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill(signal);
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(`[dev] ${error.message}`);
    stop("SIGTERM");
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    if (!stopping && code !== 0) {
      process.exitCode = code ?? 1;
      stop("SIGTERM");
    }
  });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
