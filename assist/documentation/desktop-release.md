# CodeLogix release and update

## Update behavior

The desktop checks the latest public GitHub release after startup. It downloads a newer signed MSI
to the updater cache. It does not install the MSI during this step.

The update center shows the version, release notes, and download progress. The user must select
**Install and restart**. Windows can then request administrator approval for the machine-wide MSI.

The updater uses passive MSI mode. The installer needs no answers after Windows grants approval.
The app restarts after the installer succeeds.

## Installer ownership

CodeLogix uses one Windows MSI installer type. Do not publish an NSIS installer for the
same product. Mixed installer types can create duplicate installations.

The MSI upgrade removes only components that the earlier MSI registered. It replaces the program
files, shortcuts, and uninstall registration. It does not delete workspaces or the desktop SQLite
data in the user application-data directory.

Use Windows **Installed apps** to uninstall CodeLogix. Do not delete the Program Files
directory by hand. Windows Installer uses its component registry to remove the owned files.

## Signing keys

Tauri verifies every updater package with a minisign key. This check cannot be disabled.

The local private key is outside the repository:

```text
%USERPROFILE%\.tauri\codelogicx-desktop-v2.key
```

The key password uses Windows user encryption:

```text
%USERPROFILE%\.tauri\codelogicx-desktop-v2-key-password.clixml
```

Back up both files in an approved secret vault. Loss of either file prevents updates for installed
clients. Never commit, print, log, or send the private key or its password.

Add these GitHub Actions secrets before the first release:

1. Add `TAURI_SIGNING_PRIVATE_KEY` with the private key content.
2. Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` with the key password.
3. Add an Authenticode certificate to the Windows signing process before public distribution.

The updater signature proves that the update belongs to this app. Authenticode signing separately
reduces Windows SmartScreen warnings.

## Local signed build

Run this command from the repository root:

```powershell
npm.cmd run desktop:release:build
```

The script loads the private key and password without adding them to the repository environment.
It clears both signing variables after the build.

The native compiler keeps intermediate files under the Tauri `target` directory. The release
command collects all deployable outputs under the repository root:

```text
dist/deploy/desktop/<version>/windows-x64
```

The version folder contains:

```text
app/CodeLogix.exe
app/codex.exe
installer/CodeLogix_<version>_x64_en-US.msi
installer/CodeLogix_<version>_x64_en-US.msi.sig
updater/latest.json
checksums.sha256
release.json
```

Use the MSI for installation. The `app` folder is the unpackaged application pair for controlled
testing. Keep `CodeLogix.exe` and `codex.exe` together.

The release command also checks that only the repository root contains `node_modules` and `dist`.
Nested dependency or build-output folders stop the release.

Run this command to collect an existing native build again:

```powershell
npm.cmd run desktop:release:publish
```

## GitHub release

1. Bump the repository version.
2. Run the repository and desktop checks.
3. Commit and push the reviewed files.
4. Create and push the tag `desktop-v<version>`.
5. Wait for the **Desktop release** workflow.
6. Download the workflow artifact if you need the complete root deploy folder.
7. Review the draft release, MSI, signature, and `latest.json` file.
8. Publish the draft release.

The workflow keeps the release as a draft. A draft never reaches desktop clients. Publishing the
draft is the operator approval that exposes `latest.json` to the updater.

## Recovery

If an installation fails, the existing MSI registration remains the recovery source. Do not delete
installer registry entries or Program Files manually. Repair or uninstall the registered version
through Windows Installer, then install the reviewed MSI.

Do not publish an older version as an automatic rollback. Publish a corrected higher version.
