# Data Strategy

DevKit uses one MariaDB database selected by `DB_NAME`.

Platform owns `users`, `roles`, `permissions`, `user_roles`, and `role_permissions`. DevKit modules
own all `devkit_*` product, attachment, planning, activity, and synchronization tables.
`schema_migrations` is the shared lifecycle journal and records the owning package where available.

Project Manager and Task Manager import repeatable initial JSON seeds. DevKit product records carry
sync direction, status, version, and update timestamps. Attachment binaries live beneath
`DEVKIT_STORAGE_PATH`; metadata and checksums remain in MariaDB.

Authentication uses local password hashes and persisted role assignments. Database names and
endpoints come only from `.env`. Destructive reset remains explicitly guarded.
