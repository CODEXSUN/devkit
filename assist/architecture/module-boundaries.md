# Module Boundaries

The Platform API composition root registers identity modules, then mounts the public DevKit host
adapter at `/api/devkit`. It owns ordering and dependency injection only.

`src/devkit/api` owns Project Manager, Task Manager, Planning, GitHub Dashboard, and Sync routes,
services, repositories, migrations, seeds, and types. `src/devkit/web` owns Today, Projects,
Tasks, Platform Registry, Whiteboards, GitHub Dashboard, Sync, Work Automation, and Design System
workspaces.

The Platform web desk composes `devkitWebBundle` and retains the local identity-administration
screens. DevKit must not import the Platform host. Legacy Trades module sources are not composed
and must not be used for new DevKit behavior.
