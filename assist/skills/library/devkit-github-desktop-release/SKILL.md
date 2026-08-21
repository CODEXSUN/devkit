---
name: devkit-github-desktop-release
description: Prepare, publish, and verify a versioned DevKit Desktop GitHub release. Use for an authorized commit/pull/push, signed desktop release, release-workflow failure, or updater-asset verification; do not use for VPS deployment.
---

# DevKit GitHub Desktop Release

Use this skill only when the user has explicitly authorized GitHub mutations.
It releases the DevKit Tauri desktop application from this repository. It does
not deploy the VPS or publish application services.

## Before publishing

1. Read repository governance and inspect `git status --short`, the current
   branch, upstream state, and the current version.
2. Preserve unrelated changes unless the user explicitly includes them in the
   release. Run the GitHub helper dry run before mutations:

   ```powershell
   npm.cmd run github:now -- --dry-run
   ```

3. Keep every workspace package and every versioned internal dependency under
   `@codexsun/` or `@devkit/` aligned to the root version. The matching entries
   in `package-lock.json` must use the same values. A stale internal version
   makes GitHub `npm ci` try to download a private package from the public npm
   registry.
4. Run the release checks:

   ```powershell
   npm.cmd run check:versions
   npm.cmd ci --ignore-scripts --dry-run --no-audit --no-fund
   npm.cmd run dependencies:clean
   npm.cmd run dependencies:check
   npm.cmd run github:release -- --dry-run --timeout-minutes 120
   ```

   If a full local `npm ci` is blocked by an open Windows native binary, record
   that as a local file-lock limitation. Do not claim a full local clean
   install; the dry run and the GitHub runner provide separate evidence.

## Commit and publish

1. Use `npm.cmd run github:now -- --yes` only when a new patch version is
   intended. It fetches, pulls when needed, stages, commits, and pushes.
2. For a correction that must retain the same release version, commit and push
   the reviewed correction directly. Do not trigger another automatic version
   bump.
3. Create the desktop tag only after the tagged commit is present on
   `origin/main`:

   ```powershell
   npm.cmd run github:release -- --yes --timeout-minutes 120
   ```

4. If a tag-triggered release fails before publication and a corrective commit
   is required for the same version, verify that no GitHub release exists,
   replace the annotated `desktop-v<version>` tag with the corrective commit,
   force-push only that tag, then monitor the new run. Do this only with the
   user's explicit release authorization.

## Verify the published release

Use GitHub CLI to inspect the workflow until it completes successfully:

```powershell
gh run list --repo CODEXSUN/devkit --workflow desktop-release.yml --limit 3
gh run view <run-id> --repo CODEXSUN/devkit --json status,conclusion,url,jobs
```

Then verify that the public, non-draft `desktop-v<version>` release contains:

- `DevKit_<version>_x64_en-US.msi`
- `DevKit_<version>_x64_en-US.msi.sig`
- `DevKit_Setup_<version>_x64.exe`
- `latest.json`

```powershell
gh release view desktop-v<version> --repo CODEXSUN/devkit --json url,isDraft,isPrerelease,assets
```

Report the commit, tag, workflow URL, release URL, asset names, and every check
actually run. Do not describe a draft, failed, or still-running workflow as a
published release.
