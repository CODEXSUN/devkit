import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

test("DevKit publishes an optional CXApp stack contract", async () => {
  const { devkitStackContribution } = await import("../dist/api/stack.js");

  assert.equal(devkitStackContribution.packageId, packageJson.name);
  assert.equal(devkitStackContribution.version, packageJson.version);
  assert.equal(devkitStackContribution.applicationMode, "tenant");
  assert.deepEqual(devkitStackContribution.capabilities, {
    api: true,
    database: true,
    web: true,
  });
  assert.equal(Object.isFrozen(devkitStackContribution), true);
  assert.equal(Object.isFrozen(devkitStackContribution.capabilities), true);
});

test("DevKit exports only implemented stack capabilities", () => {
  assert.deepEqual(Object.keys(packageJson.exports).sort(), [
    ".",
    "./api",
    "./database",
    "./host",
    "./stack",
    "./web",
    "./web/cxapp",
  ]);
});

test("host discovery does not require an active request database", async () => {
  const host = await import("../dist/api/app.js");
  const database = await import("../dist/api/database/index.js");

  assert.equal(typeof host.registerDevkitApiForHost, "function");
  assert.equal(typeof database.devkitDatabaseLifecycle.runSql, "function");
  assert.deepEqual(database.devkitDatabaseLifecycle.migrations, [
    "devkit.project-manager.sql.v4",
    "devkit.task-manager.sql.v2",
    "devkit.planning.sql.v1",
    "devkit.sync.sql.v1",
  ]);
});
