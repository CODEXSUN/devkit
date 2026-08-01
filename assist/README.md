# DevKit Assist

DevKit is standalone and single-client. Platform supplies local identity, authorization, one
MariaDB connection, and the executable API/web shell. DevKit supplies developer planning,
projects, tasks, registry, whiteboards, repository status, attachments, and optional cloud sync.

There is one MariaDB database selected by `DB_NAME`. Do not add tenant selectors, database
routers, external identity gateways, or a second application shell.

Read `AGENT-GUIDE.md`, then the relevant architecture and governance rules before changing code.
