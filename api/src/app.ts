import { createDevkitRuntime } from "./stack.js";

export async function createApp() {
  return (await createDevkitRuntime()).app;
}
