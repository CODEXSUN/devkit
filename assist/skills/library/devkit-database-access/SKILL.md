---
name: devkit-database-access
description: Safely inspect and make narrowly approved DevKit database changes on a local workspace or the managed VPS.
---

# DevKit Database Access

Use this policy whenever a request concerns application data, migrations, seeds,
database configuration, or a VPS database.

## Connection discovery

1. Identify the selected application and its owning repository before connecting.
2. Read connection settings only from the selected runtime `.env`; never invent a
   host, port, database, user, container name, or environment role.
3. Do not put credentials, connection strings, tokens, or complete environment
   files in a prompt, chat response, command argument, log, commit, or artifact.
4. Report only safe connection facts: environment class, configured database name,
   database driver, host type (local, Docker service, or remote), and a successful
   health or read-only query result.

## Local workspace

1. Prefer the repository-owned database commands and migrations over raw SQL.
2. Inspect first: Git status, runtime health, migration journal, schema ownership,
   and the smallest affected record set.
3. Keep every change in the owning module. Use an additive migration for schema
   changes and a repeatable seed only for intended system defaults.
4. A database write needs a precise user request, affected tables or records,
   expected result, and verification query. Make only that change.

## Managed VPS

1. Start through the approved SSH target and inspect `/home/devkit`, the current
   Git state, Docker Compose health, and runtime configuration presence without
   printing secret values.
2. Treat the VPS database as production. Do not connect to guessed addresses or
   expose its database port publicly. Use the DevKit API container and its existing
   Compose environment only after confirming the active DevKit project.
3. Before any write, require explicit approval for the exact migration, seed, or
   record update. Take the repository-approved backup path when the operation can
   change persistent data.
4. Use the guarded DevKit updater for released changes. Verify API and web health,
   migration journal, and the affected feature after completion.

## Cloud and anonymous access

1. A cloud runtime treats the Skill Library as read-only. Do not create, edit,
   enable, disable, or remove a skill from cloud.
2. Make skill changes in the approved local repository and release them through
   the guarded deployment path.
3. Do not answer an unauthenticated agent request or inspect its project,
   database, files, configuration, or history.
4. Tell an unauthenticated requester: "Please sign in or contact an administrator
   for access, answers, or support."

## Emergency override

1. Cloud skill changes remain blocked unless the API confirms an emergency override.
2. The override requires an authenticated Super Administrator, a valid emergency
   key in a protected request field, and a specific reason.
3. Never ask for, accept, echo, store, or place the emergency key in an agent chat.
4. The server stores only a one-way hash of the emergency key in `.env`.
5. Use the override only for the single required Skill Library change. Return to
   read-only cloud behavior after the request.

## Strict mutation policy

- Read-only inspection is the default.
- Never run `DROP`, `TRUNCATE`, `DELETE` without a tightly scoped approved record
  target, database reset, global cleanup, `docker system prune`, or any command
  that affects another application.
- Never alter credentials, database grants, production `.env`, container topology,
  or network bindings without separate explicit approval.
- Do not execute arbitrary SQL supplied in a prompt. Translate approved changes
  into module-owned migrations, repositories, or bounded parameterized queries.
- Stop and ask for direction when the target app, database, environment, or record
  scope is ambiguous.

## Required evidence

For every database operation, record the application, environment, approved
scope, command or migration key, result, verification, and any remaining risk.
Do not claim cloud, VPS, or database success without live evidence.
