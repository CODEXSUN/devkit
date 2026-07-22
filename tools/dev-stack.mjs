import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npm, ["run", "dev:api"], { stdio: "inherit" }),
  spawn(npm, ["run", "dev:web"], { stdio: "inherit" })
];

function stop() { for (const child of children) if (!child.killed) child.kill(); }
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await Promise.race(children.map((child) => new Promise((resolve) => child.on("exit", resolve))));
stop();
