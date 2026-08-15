import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  assertReleaseAssets,
  npmInvocation,
  releaseTag,
  requiredReleaseAssets
} from "./github-release.mjs";

test("builds the desktop release tag", () => {
  assert.equal(releaseTag("1.2.3"), "desktop-v1.2.3");
  assert.throws(() => releaseTag("1.2"), /Invalid release version/u);
});

test("requires every public updater asset", () => {
  const version = "1.2.3";
  const release = { assets: requiredReleaseAssets(version).map((name) => ({ name })) };
  assert.doesNotThrow(() => assertReleaseAssets(release, version));
  assert.throws(
    () => assertReleaseAssets({ assets: release.assets.slice(1) }, version),
    /CodeLogix_1\.2\.3_x64_en-US\.msi/u
  );
});

test("reports invalid CLI options without leaking a stack trace", () => {
  const result = spawnSync(
    process.execPath,
    [resolve(import.meta.dirname, "github-release.mjs"), "--timeout-minutes", "2", "--dry-run"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Release failed: --timeout-minutes must be an integer from 5 to 120\./u
  );
  assert.doesNotMatch(result.stderr, /at numberOption/u);
});

test("runs npm scripts through the Windows command shell", () => {
  assert.deepEqual(npmInvocation(["run", "check:versions"], "win32", "cmd.exe"), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "npm.cmd", "run", "check:versions"]
  });
  assert.deepEqual(npmInvocation(["run", "check:versions"], "linux"), {
    command: "npm",
    args: ["run", "check:versions"]
  });
});
