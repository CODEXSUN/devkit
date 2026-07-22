# CODEXSUN Devkit

Standalone developer workspace extracted from CODEXSUN Platform. Devkit owns the existing Project Manager, Task Manager, Platform Registry, Work Automation, JSON data stores, and Assist knowledge base.

## Development

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

- Web: `http://127.0.0.1:7040`
- API: `http://127.0.0.1:7030`

The Framework and UI dependencies are local sibling links during development. Devkit binds to localhost by default and is not yet a production collaboration service. Authentication, team sharing, threaded discussions, and richer bug workflows are future Devkit work; this extraction intentionally moves the current capabilities without implementing that roadmap.

## Ownership

- `api/src/modules/project-manager`: planning, issues, activities, reviews, releases, timelines, todos, and registry data
- `api/src/modules/task-manager`: task lists and lookups
- `web/src/modules`: Project Manager, Task Manager, Platform Registry, and Work Automation UI
- `assist`: development rules, architecture, operations, planning, and project documentation
