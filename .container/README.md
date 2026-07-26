# DevKit Docker deployment

Run `bash setup.sh` for first installation and `bash update.sh` for updates.
DevKit uses CXApp-owned MariaDB, Redis, Media, backend network, and edge network
without creating them. Cloudflare routes `devkit.codexsun.com` to
`http://devkit-web:80`.
