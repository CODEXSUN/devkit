# DevKit Container Deployment Rules

DevKit owns only `devkit-api`, `devkit-web`, `devkit-data`, and `devkit_db`.
It consumes healthy `cxapp-mariadb`, `cxapp-redis`, `cxapp-media`,
`cxapp-network`, and `cxapp-edge`; it never creates, removes, or rebuilds them.

Normal updates preserve `devkit_db`. A fresh database requires an interactive
exact `DROP devkit_db` confirmation. `cxsun_master_db` and `codexsun_db` are
always protected and cannot be targeted by DevKit scripts.
