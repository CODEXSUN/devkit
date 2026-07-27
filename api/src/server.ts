import { registerCxAppShutdown } from "@codexsun/cxapp";
import { createDevkitRuntime } from "./stack.js";

const runtime = await createDevkitRuntime();
registerCxAppShutdown(runtime);
await runtime.listen();
