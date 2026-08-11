# Module Boundaries

The Platform API composition root registers identity modules, then mounts the public DevKit host
adapter at `/api/devkit`. It owns ordering and dependency injection only.

`apps/devkit/api` owns Project Manager, Task Manager, Planning, GitHub Dashboard, and Sync routes,
services, repositories, migrations, seeds, and types. `apps/devkit/web` owns Today, Projects,
Tasks, Platform Registry, Whiteboards, GitHub Dashboard, Sync, Work Automation, and Design System
workspaces.

The `apps/platform/web` desk composes `devkitWebBundle` and retains the local identity-administration
screens. DevKit must not import the Platform host. Proprietary business application modules do not
belong in this repository; DevKit records only their lifecycle links and engineering evidence.
