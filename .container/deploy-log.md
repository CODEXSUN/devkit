# DevKit Deployment Log

## Version state

Current documented release: 1.0.46

Never record secrets. Insert new entries above older entries.

## [1.0.46] 2026-07-26 09:16 UTC - Setup and update verified

- Built and deployed `devkit-api` and `devkit-web`, ran owner-local
  migrations/seeds, and exercised the update workflow.
- Setup, update, API/Web health, smoke test, and edge-origin probe passed.
- Source revision was `52f4cd6`; dirty local product work was preserved.
- Runtime fixes copy project-manager JSON registries into the image and allow
  externally supplied container environment.
- Only `devkit_db` can be recreated after exact confirmation; CXApp protected
  databases are hard blocked.
- CXApp shared infrastructure retained its running identities.
- Follow-up: the root dependency layer reports five high-severity npm audit
  findings and the Web build reports a chunk above 500 kB.
- `devkit.codexsun.com` activation remains pending in Cloudflare.
