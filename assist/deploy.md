# Docker Deployment Runtime

DevKit Docker deployment separates immutable application files from mutable Agent state. The API
image includes Git and starts through `api-entrypoint.sh`, which prepares the mounted runtime
directories and then drops privileges to the `node` user.

Compose owns three persistent Agent volumes:

- `/var/lib/devkit/codex` for Codex authentication and state;
- `/srv/devkit/repositories` for complete Git repositories;
- `/var/lib/devkit/worktrees` for isolated Agent worktrees.

Setup and update preflight checks confirm that the API runs as UID 1000, Git is executable, and all
three directories are writable. A project must reference a complete clone below the repository
root. An empty `git init` in the application image is not a valid source repository.

Use these checks after deployment:

```sh
docker exec devkit-api sh -lc 'id; git --version'
docker exec devkit-api sh -lc 'test -w "$DEVKIT_CODEX_HOME"'
docker exec devkit-api sh -lc 'test -w "$DEVKIT_AGENT_WORKTREE_ROOT"'
docker exec devkit-api sh -lc 'test -w "$DEVKIT_AGENT_ALLOWED_ROOTS"'
```

Do not run the API as root, apply recursive `chmod 777`, bake secrets into the image, or mount Git
metadata without its matching checkout.
