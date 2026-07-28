# DevKit local/cloud synchronization

DevKit uses one owner package in two explicit runtime roles:

- `local` stores the cloud token encrypted and exposes **Bind**, **Pull**, and
  **Publish Live** on the DevKit Overview.
- `cloud` exposes token generation and the authenticated snapshot exchange at
  `https://devkit.codexsun.com/api/devkit-sync`.

CXApp remains the runtime composer and supplies the trusted database scope.
DevKit owns its routes, migrations, records, token verification, snapshots,
runs, and conflicts.

## Prepare the cloud host

1. Provision the standard CXApp MariaDB, Redis, API, web, and media services.
2. Copy `cloud/cloud.env.example` values into `cxapp/.env` and generate two
   different secrets of at least 32 characters.
3. Put the same generated values in the shell environment used by Compose.
4. Point the `devkit.codexsun.com` A/AAAA record at the host.
5. Start the standard CXApp Compose file together with
   `cloud/docker-compose.override.yml`. Caddy obtains and renews TLS.
6. Run the normal CXApp migration/seed lifecycle, sign in to DevKit Overview,
   and generate a 16-character binding token.

Example from the workspace root:

```powershell
docker compose --env-file cxapp/.container/deploy.env `
  -f cxapp/.container/cxapp/docker-compose.yml `
  -f devkit/deploy/cloud/docker-compose.override.yml `
  up -d --build
```

## Bind a local installation

1. Add the values from `local/local.env.example` to the local `cxapp/.env`.
2. Start CXApp normally and allow its migration/seed lifecycle to complete.
3. Open DevKit Overview, paste the one-time cloud token, and bind the instance.
4. Use **Pull Latest** before **Publish Live** when the cloud revision changed.

The endpoint is deliberately fixed to `https://devkit.codexsun.com`; production
clients cannot redirect synchronization to a browser-supplied host.

## Data and security model

All nine DevKit product tables carry `sync_direction`, `sync_status`,
`sync_version`, and `sync_updated_at`. Deletes are tombstones so they propagate.
Token hashes are peppered on cloud, local token copies are AES-256-GCM
encrypted, payloads have SHA-256 checksums, revision conflicts require a pull,
and every run/conflict is persisted in `devkit_sync_*` tables.

Authentication users, password hashes, migration history, and sync-control
tables are intentionally excluded from product snapshots. Attachment binaries
travel with the snapshot, are checked against their stored SHA-256 checksum,
and are written only beneath `DEVKIT_STORAGE_PATH`.
