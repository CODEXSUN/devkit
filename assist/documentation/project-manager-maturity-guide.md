# Project Manager Maturity Guide

Project Manager is not a live-control switch first. It is the shared map of the software. Its first job is to help the team understand what exists, what is planned, what is risky, what is missing, and what each change touches.

## Core Idea

Mature software teams do not think only in pages or database tables. They think in connected responsibilities:

- What business area does this belong to?
- Which module owns it?
- Which user workflow does it support?
- Which permissions protect it?
- Which APIs execute it?
- Which screens expose it?
- Which tables store it?
- Which tests prove it?
- Which team owns it?
- Which planned work will change it?

Project Manager should make those relationships visible.

The working shape should start with the software map:

```text
Platform
  App / Area
    Module Group
      Module
        Feature
          Action
          API
          Screen
          Database field
          Planning item
          Notes / decisions
```

Then it can grow into the delivery layer:

```text
Module
  Work
    Todos
    Tasks
    Issues
    Reviews
    Changelog
    GitHub references
    Releases
    Timeline
```

And then into the automation layer:

```text
Command / trigger
  Automation worker
    External system action
      Project Manager event
      Registry reference update
      Activity timeline entry
```

Do not build every project-management feature before the registry is useful. A mature Project Manager grows in layers.

## Recommended Build Order

Build in this order so each stage has value by itself:

1. Software map: Platform, App/Area, Module Group, Module.
2. Capability map: Feature, Action, API, Screen, Database field.
3. Ownership map: owner/team, scope, status, version, dependencies.
4. Work map: Todos, Tasks, Issues, Reviews.
5. Traceability map: Activities, Timeline, Changelog, GitHub references.
6. Delivery map: Roadmap, Milestones, Releases, Kanban.
7. Automation map: command triggers, workers, event writes, external references.
8. Control map: Coverage dashboards, governance rules, automated checks.
9. Runtime connection: sidebar generation, permission generation, API coverage validation.

This order prevents the system from becoming a large empty project-management tool with no software truth inside it.

## How Teams Should Use It

### Product / Planning

Product owners should use Project Manager to see what features exist, what is planned, and where each improvement belongs.

Good planning records should answer:

- What problem are we solving?
- Which platform/module/feature is affected?
- Is this a new feature, enhancement, bug, cleanup, or release task?
- Which screens, APIs, permissions, and tables may change?
- What is the owner team?
- What version or milestone is targeted?
- What is the current status?

Planning should not live away from the product map. Every task should attach to the module or feature it changes.

### Engineering

Developers should use Project Manager before touching code.

Before implementation, check:

- Is the module already registered?
- Is the feature/action already mapped?
- Is the permission key known?
- Are backend routes listed?
- Are frontend screens listed?
- Are database fields owned by this module?
- Are tests expected?
- Are dependencies or risk notes present?

After implementation, update:

- Feature status
- API coverage
- Screen coverage
- Database field ownership
- Permission mapping
- Test path
- Notes and known gaps

This turns Project Manager into a living engineering checklist.

### QA / Review

QA should use it as a coverage map.

Useful review questions:

- Does every active feature have at least one screen or API?
- Does every risky API have permission and audit mapping?
- Does every lifecycle action have a clear restore/delete behavior?
- Does every screen have expected list/show/upsert/delete coverage?
- Does every database field have a nature and owner?
- Are planned features accidentally visible as active?

The goal is not only testing screens. The goal is testing the software contract.

### Operations / Support

Support and operations teams need traceability.

When a problem is reported, Project Manager should help answer:

- Which module owns this behavior?
- Which APIs are involved?
- Which table fields store the affected state?
- Which audit event should exist?
- Which permission controls access?
- Which team owns the fix?
- Is this a known gap or new bug?

This makes debugging faster because the system has a map.

## Module Working Area

The module working area is the heart of Project Manager. It should explain the software model first. Team delivery views should attach to it after the module is understandable.

Recommended first-level module tabs:

1. Overview
2. Features
3. Actions
4. APIs
5. Screens
6. Database
7. Planning
8. Notes
9. Activity

Recommended secondary delivery tabs:

1. Todos
2. Tasks
3. Issues
4. Reviews
5. Kanban
6. Timeline
7. Changelog
8. GitHub
9. Releases
10. Roadmap
11. Milestones
12. Dependencies
13. Decisions
14. Attachments

Keep the registry tabs before delivery tabs. A task board is useful only when it can point to the real module, feature, API, screen, or database field it affects.

### Feature Registry

Feature Registry describes user-visible or system-visible capability.

Examples:

- List tenants
- Create tenant
- Suspend tenant
- Restore tenant
- Manage domain mapping
- Export subscription report

Important fields:

- Feature key
- Type: page, action, api, report, setting, workflow
- Route path
- Permission key
- Status
- Owner/team

### Actions

Actions describe what the user or system can do.

Examples:

- Create tenant
- Update tenant
- Suspend tenant
- Force delete tenant
- Assign plan

Each action should connect to:

- Feature
- Permission key
- UI location
- API route
- Audit event
- Risk level
- Lifecycle behavior

### APIs

APIs should be flattened by operation so teams can scan coverage quickly.

Recommended operation names:

- list
- create
- show
- edit
- suspend
- restore
- delete
- export
- import
- bulk action

Each API row should answer:

- What operation is this?
- Which method and route?
- Which permission protects it?
- Which audit event should be written?
- Is tenant context required?
- Is it a lifecycle action?
- What is the risk level?

Example:

```text
Operation: create
Method: POST
Route: /admin/tenants
Permission: platform.tenant.profile.manage
Audit: tenant.created
Risk: high
```

### Screens

Screens describe the frontend surface.

Useful page types:

- list
- show
- upsert
- dialog
- activity
- dashboard
- report
- setting

Each screen should map:

- Route
- Component path
- Page type
- Shared UI usage
- Test path
- Related feature/action

### Database

Database should be field-level when the team needs control.

A mature database map does not only say `tenants` table exists. It explains the nature of important fields.

Useful field nature values:

- primary key
- business identity
- routing identity
- foreign key
- lifecycle state
- audit timestamp
- soft delete marker
- configuration
- counter
- computed
- json metadata

Each database row should answer:

- Which table?
- Which field?
- What type?
- What is the field nature?
- Is it nullable?
- Is it indexed?
- Is it unique?
- Does it relate to another table?
- Does it participate in soft delete?
- Which module owns it?

Example:

```text
Table: tenants
Field: status
Type: enum
Nature: lifecycle state
Default: active
Indexed: yes
Owner module: Tenant
```

### Planning

Planning sits on top of the registry.

Planning records should include:

- Epic
- Feature
- Task
- Bug
- Release
- Milestone
- Version

Each planning item should connect back to the module/feature/action/API/screen/database area it affects.

### Notes

Notes are for the thinking that does not fit into a field.

Use notes for:

- Known gaps
- Debug findings
- Migration concerns
- Architecture questions
- Team handoff notes
- Future enhancement ideas
- Links to formal decisions

Rich notes should be used carefully. They should explain why, not duplicate all structured fields.

## Delivery And Collaboration Views

These views manage the team's work around the software map. They should not replace the registry. They should attach to it.

Recommended delivery flow:

```text
Issue / idea
  Planning item
    Task
      Todo checklist
      Review
      GitHub branch / PR
      Changelog
      Release
      Activity / timeline
```

Kanban, roadmap, and milestones are alternate views of the same linked work. They should not create separate disconnected records.

### Todos

Todos are the smallest practical follow-up items attached to the software map.

Use todos for:

- Missing registry details
- Review reminders
- Small implementation steps
- Cleanup work
- QA follow-up
- Documentation gaps
- Debug checks

Each todo should include:

- Title
- Description
- Owner
- Priority
- Due date
- Status
- Linked module
- Linked feature/action/API/screen/database row
- Related planning item

Recommended todo statuses:

- open
- in-progress
- blocked
- review
- done
- cancelled

Todos should not replace tasks. A task belongs to planning. A todo is a lightweight reminder or checklist item that keeps the registry accurate.

### Task Assignment

Tasks are owned work units. A task should be assignable, reviewable, estimable, and traceable.

Each task should include:

- Title
- Description
- Type: feature, bug, chore, refactor, test, docs, release, research
- Assignee
- Reporter
- Reviewer
- Watchers
- Priority
- Severity for bugs
- Estimate
- Due date
- Start date
- Target version
- Status
- Linked module
- Linked feature/action/API/screen/database row
- Linked GitHub branch/PR/issue
- Required tests
- Acceptance criteria

Recommended task statuses:

- backlog
- ready
- assigned
- in-progress
- blocked
- in-review
- changes-requested
- qa
- done
- cancelled

Assignment should be explicit. A task without an assignee is not active work. A task without a reviewer should not be considered ready for merge.

### Reviews

Reviews are quality gates around tasks, registry changes, pull requests, and releases.

Review types:

- Code review
- Product review
- QA review
- Security review
- Database review
- Permission review
- API contract review
- UI/design review
- Release review

Each review should include:

- Reviewer
- Review type
- Status
- Requested at
- Completed at
- Decision
- Comments
- Blocking issues
- Linked task
- Linked PR
- Linked registry records

Recommended review decisions:

- approved
- changes requested
- needs discussion
- blocked
- rejected

Reviews should be connected to the registry. If an API changes, the API registry row should show the review history. If a table field changes, the database registry row should show whether database review happened.

### Commands And Replies

Project Manager should support command-style collaboration because teams often need fast structured actions inside comments.

Command examples:

```text
/assign @user
/review @user
/status in-review
/priority high
/link-pr #128
/link-issue #44
/link-module tenant
/due 2026-07-15
/block waiting for migration review
/unblock
/release v1.5.0
/todo add e2e coverage
/decision approved
github:now
release:prepare v1.5.0
coverage:scan tenant
api:verify tenant
```

Replies should be threaded under tasks, reviews, issues, activities, and registry records.

Each reply should include:

- Author
- Message
- Created at
- Edited at
- Mentions
- Attachments
- Commands applied
- Linked record

Command handling should be visible. If someone writes `/assign @me`, Project Manager should record an activity like:

```text
Task assigned to Sundar by command.
```

This makes collaboration fast without losing traceability.

## Automation Layer

Automation should turn useful commands into repeatable work. Every automation must write back to Project Manager as an event, reference, or activity. If an automation acts outside the registry and leaves no trace, it is not mature enough.

Automation should follow this pattern:

```text
Trigger
  Resolve context
    Run action
      Write result
        Add activity
        Update linked record
        Notify owner/reviewer if needed
```

### Automation Rules

Every automation should know:

- Who triggered it
- Which module/task/issue/release it belongs to
- What external system it touched
- What changed
- Whether it succeeded or failed
- Which reference was created
- What the next action is

Every automation result should write:

- Activity event
- Command log
- Status change when applicable
- External reference when applicable
- Error message when failed
- Follow-up todo when incomplete

### Command Pattern

Use a simple command pattern:

```text
<system>:<action> [target] [options]
```

Examples:

```text
github:now
github:sync tenant
github:link-pr #128
github:push-ref current
release:prepare v1.5.0
release:publish v1.5.0
coverage:scan tenant
permissions:sync tenant
api:verify tenant
db:map tenant
screen:scan tenant
todo:open
activity:write
```

### `github:now`

`github:now` should collect the current GitHub/source-control state and write it back to the correct Project Manager record.

It should try to resolve:

- Current repository
- Current branch
- Latest commit SHA
- Latest commit message
- Current pull request if one exists
- Pull request URL
- Issue references
- Author
- Review status
- Merge status
- Push time

Then it should write:

- GitHub reference row
- Activity event
- Timeline event
- Task or issue link when context exists
- Changelog draft when the change is release-relevant

Example result:

```text
Command: github:now
Module: Tenant
Branch: feature/tenant-api-coverage
Commit: abc1234
PR: #128
Event: github.reference.updated
Next: Review requested from Platform team
```

If context cannot be resolved, it should not silently fail. It should create a follow-up todo:

```text
Todo: Link GitHub reference manually
Reason: Could not detect related module or task.
```

### Automation Events

Useful automation event names:

- automation.command.received
- automation.command.completed
- automation.command.failed
- github.reference.updated
- github.pr.linked
- github.commit.linked
- github.issue.linked
- release.version.prepared
- release.version.published
- coverage.scan.completed
- coverage.gap.detected
- api.coverage.updated
- database.coverage.updated
- screen.coverage.updated
- permission.coverage.updated
- todo.created_by_automation

### Suggested Automations

#### GitHub

Commands:

- `github:now`
- `github:sync`
- `github:link-pr #number`
- `github:link-issue #number`
- `github:push-ref current`

Writes to:

- GitHub references
- Activities
- Timeline
- Changelog draft
- Task/issue links

#### Coverage

Commands:

- `coverage:scan <module>`
- `api:verify <module>`
- `screen:scan <module>`
- `db:map <module>`
- `permissions:sync <module>`

Writes to:

- Coverage dashboard
- Missing items todos
- Module activity
- Registry rows when safe

#### Release

Commands:

- `release:prepare <version>`
- `release:publish <version>`
- `release:rollback <version>`

Writes to:

- Release record
- Changelog
- GitHub references
- QA sign-off checklist
- Timeline

#### Task And Review

Commands:

- `task:assign @user`
- `task:block <reason>`
- `task:done`
- `review:request @user`
- `review:approve`
- `review:changes`

Writes to:

- Task status
- Review records
- Activity
- Notifications

#### Registry

Commands:

- `module:scan <module>`
- `api:add <method> <route>`
- `screen:add <route>`
- `db:add-field <table.field>`
- `permission:map <key>`

Writes to:

- Module registry
- API registry
- Screen registry
- Database registry
- Permission mapping

### Automation Safety

Automations should not directly control production behavior at first. They should write references, suggestions, todos, and coverage results.

Before an automation changes important registry data, it should have one of these modes:

- suggest: create proposed changes only
- write: update Project Manager JSON/database
- apply: update runtime configuration

Recommended default:

```text
suggest first, write after review, apply only when governance is mature
```

This keeps Project Manager useful without making it dangerous.

### Automation Context Resolution

When a command is triggered, Project Manager should resolve context in this order:

1. Explicit target in command.
2. Current task or issue.
3. Current module page.
4. Current branch name.
5. PR title or issue title.
6. Commit message.
7. Manual selection fallback.

Example:

```text
github:now tenant
```

This should attach GitHub references to the Tenant module.

If the user only runs:

```text
github:now
```

Project Manager should infer the module from branch/PR/task context. If it cannot infer safely, create a todo instead of guessing.

### Automation Log

Every command should create a command log entry.

Fields:

- Command text
- Triggered by
- Trigger source
- Started at
- Completed at
- Status
- Resolved context
- External calls made
- Records updated
- Error message
- Follow-up todos

This makes automations auditable and debuggable.

### Issue Boards

Issue boards should work like GitHub-style issue tracking, but connected to the software map.

Issue types:

- Bug
- Feature request
- Enhancement
- Tech debt
- Support issue
- Security issue
- Regression
- Documentation issue
- Research

Each issue should include:

- Title
- Description
- Type
- Status
- Priority
- Severity
- Labels
- Reporter
- Assignee
- Reviewer
- Module
- Feature/action/API/screen/database link
- Environment
- Reproduction steps
- Expected behavior
- Actual behavior
- Attachments
- GitHub issue reference
- Related tasks
- Related release

Recommended issue statuses:

- open
- triage
- accepted
- planned
- in-progress
- blocked
- in-review
- qa
- resolved
- closed
- duplicate
- wont-fix

Issue boards should support filters by module, assignee, label, priority, severity, status, version, and release.

### Kanban

Kanban is the daily work view.

Recommended columns:

- Backlog
- Ready
- Assigned
- In Progress
- Blocked
- Review
- QA
- Done

Each card should show:

- Title
- Type
- Priority
- Assignee
- Module
- Target version
- Due date
- Blocked marker
- Review marker
- Linked PR marker

Kanban movement should create activity events.

Example:

```text
Task moved from In Progress to Review.
```

Kanban should not be separate from the registry. Clicking a card should reveal linked module, APIs, screens, database fields, todos, reviews, and GitHub references.

### Timeline

Timeline shows what happened and what is planned.

Timeline should include:

- Tasks created
- Tasks assigned
- Status changes
- Reviews requested
- Reviews completed
- PR linked
- Commit linked
- Issue opened
- Issue closed
- Changelog item added
- Release created
- Release shipped
- Database migration added
- API risk changed
- Permission changed

Timeline views:

- Module timeline
- Feature timeline
- User timeline
- Release timeline
- Team timeline
- Issue timeline

A mature timeline should support filtering:

- By actor
- By module
- By event type
- By date range
- By release
- By priority/risk

Timeline is the answer to: what changed, when, by whom, and why?

### Roadmap

Roadmap is the forward-looking view.

Roadmap items should connect to:

- Platform
- Module group
- Module
- Feature
- Planning item
- Milestone
- Release
- Owner
- Target date
- Confidence

Recommended roadmap lanes:

- Now
- Next
- Later
- Research
- Deprecated / Removal

Roadmap should be high-level. Detailed execution belongs in tasks, issues, and kanban.

### Milestones

Milestones group work toward a clear delivery target.

Each milestone should include:

- Name
- Goal
- Owner
- Start date
- Target date
- Status
- Included tasks
- Included issues
- Included modules/features
- Release link
- Risks
- Completion percentage

Milestones help teams avoid scattered work.

### Labels

Labels help organize work across boards.

Useful label groups:

- Type: bug, feature, chore, docs, test, refactor
- Area: frontend, backend, database, permissions, release
- Risk: low, medium, high, critical
- Status: blocked, needs-review, needs-design, needs-qa
- Customer: support, internal, tenant, admin
- Scope: super-admin, admin, tenant, public, api, system

Labels should be controlled enough to stay useful. Too many free-form labels become noise.

### Dependencies

Dependencies should be visible before work starts.

Dependency types:

- Blocks
- Blocked by
- Related to
- Duplicates
- Depends on module
- Depends on API
- Depends on migration
- Depends on permission
- Depends on design
- Depends on release

Dependency visibility helps prevent teams from starting work that cannot finish.

### Notifications

Project Manager should eventually notify users when attention is needed.

Notification triggers:

- Assigned to task
- Mentioned in reply
- Review requested
- Review approved
- Changes requested
- Task blocked
- Due date near
- Release changed
- PR linked
- High-risk API changed
- Database field changed

Notifications should be actionable, not noisy.

### Attachments

Attachments support the real-world detail around work.

Useful attachments:

- Screenshots
- Logs
- Error traces
- API responses
- Design files
- Exported reports
- Migration notes
- QA evidence

Every attachment should link to a task, issue, review, or registry record.

### Decisions

Decisions are different from comments. A decision records a settled direction.

Decision fields:

- Decision title
- Context
- Decision
- Alternatives considered
- Consequences
- Owner
- Date
- Linked module/feature/task

This is useful for architecture, permissions, database design, API shape, and release strategy.

### Activities

Activities should record what happened to the module over time.

Useful activity events:

- Registry row created
- Registry row updated
- Status changed
- Owner changed
- Task assigned
- Review requested
- Review approved
- Changes requested
- Command applied
- Issue opened
- Issue moved
- Kanban card moved
- Milestone updated
- Timeline event created
- API added
- Permission changed
- Database field added
- Screen mapped
- Todo completed
- Planning item moved
- Release version linked
- GitHub push linked

Each activity should include:

- Event name
- Human-readable summary
- Actor
- Timestamp
- Before/after values when useful
- Linked registry record
- Linked planning item
- Linked GitHub reference when available

Activity is important because mature teams need traceability. It should answer: who changed the map, what changed, and why does it matter?

### Changelog

Changelog should explain meaningful product and engineering changes by version.

Use a version pattern consistently:

```text
vMAJOR.MINOR.PATCH
```

Recommended meaning:

- MAJOR: large workflow, architecture, compatibility, or permission model change
- MINOR: new module, feature, screen, API group, or planned product capability
- PATCH: fixes, small enhancements, field additions, copy changes, or cleanup

Recommended changelog sections:

- Added
- Changed
- Fixed
- Deprecated
- Removed
- Security
- Migration
- Known gaps

Each changelog item should connect to:

- Platform
- Module group
- Module
- Feature/action/API/screen/database row
- Planning item
- GitHub branch/commit/PR
- Release version

Good changelog item:

```text
v1.4.0
Added
- Tenant module API coverage map for list/create/show/edit/suspend/restore/delete.

Linked:
- Module: Tenant
- APIs: tenant.api.*
- PR: #128
- Commit: abc1234
```

The changelog should not become a dumping ground for every small internal edit. It should describe changes that help future developers, support teams, QA, and release owners understand the software.

### GitHub References

Project Manager should link registry and planning work to source-control history.

Useful GitHub fields:

- Repository
- Branch
- Commit SHA
- Pull request number
- Pull request URL
- Issue number
- Issue URL
- Author
- Reviewers
- Merge status
- Pushed at
- Released version

GitHub references help answer:

- Which code change implemented this feature?
- Which PR changed this API?
- Which commit introduced this database field?
- Which branch contains the fix?
- Was the change reviewed?
- Was it merged?
- Was it released?

Recommended branch naming:

```text
feature/<module>-<short-purpose>
fix/<module>-<short-purpose>
chore/<module>-<short-purpose>
release/vMAJOR.MINOR.PATCH
```

Examples:

```text
feature/tenant-api-coverage
fix/tenant-suspend-audit
chore/project-manager-schema-map
release/v1.5.0
```

Recommended commit message pattern:

```text
<type>(<module>): <short summary>
```

Examples:

```text
feat(tenant): add suspend and restore API registry
fix(tenant): map deleted_at as soft delete marker
docs(project-manager): add maturity workflow guide
```

Recommended PR title pattern:

```text
<Type>: <Module> - <Outcome>
```

Example:

```text
Feature: Tenant - complete API and database coverage map
```

### Releases

Release records should connect changelog, planning, GitHub, and registry state.

Each release should include:

- Version
- Release name
- Status
- Planned date
- Released date
- Owner
- Changelog items
- Included planning items
- Included modules/features
- GitHub PRs
- Migration notes
- QA sign-off
- Known issues
- Rollback notes

Recommended release statuses:

- planned
- building
- qa
- ready
- released
- hotfix
- rolled-back

Release records make the registry useful for more than development. They help the team explain what shipped.

## Status Model

Use status consciously.

Recommended statuses:

- planned: known but not built
- active: built and currently used
- deprecated: still exists but should be replaced
- blocked: cannot continue until another item is resolved
- needs-review: built or mapped but needs validation

Do not use active for ideas. Active should mean the software has real behavior or the team has accepted it as current truth.

## Coverage Dashboards To Build

Once the data is stable, Project Manager should produce dashboards.

High-value dashboards:

- Modules without features
- Features without actions
- Actions without permissions
- APIs without permissions
- APIs without audit events
- Risky APIs without lifecycle notes
- Screens without test paths
- Database fields without owner module
- Tables touched by multiple modules
- Planned features without tasks
- Active sidebar items missing from registry
- Registry modules missing from sidebar
- Deprecated routes still in use
- Todos overdue
- Planning items without owner
- Changelog items without GitHub reference
- GitHub PRs without registry link
- Released items still marked planned
- Database fields changed without migration note
- High-risk APIs without QA sign-off
- Activities without actor
- Releases without rollback notes

This is where Project Manager becomes a real improvement engine.

## Team Workflow

Recommended workflow for any new enhancement:

1. Register or update the module.
2. Register the feature.
3. Add actions.
4. Add API routes.
5. Add screens.
6. Add database fields.
7. Add permissions and audit events.
8. Add planning item and owner.
9. Add test path or test expectation.
10. Add todos for any incomplete follow-up.
11. Link branch, commit, PR, or issue.
12. Add changelog item when the change matters to future readers.
13. Link release/version when scheduled.
14. Mark status only when the work is actually true.

This gives the team a repeatable path from idea to implementation.

## Governance Needs

Mature teams also need guardrails.

Recommended governance rules:

- Every active module needs an owner.
- Every active API needs a permission decision.
- Every high-risk API needs audit coverage.
- Every database field needs a table owner and field nature.
- Every release needs a changelog.
- Every merged PR should link to a planning item or registry row.
- Every deprecated item needs a replacement or removal plan.
- Every planned item needs a clear owner before development starts.
- Every major change needs a note explaining why.

These rules can later become automated checks inside Project Manager.

## Common Blockers To Avoid

Avoid these patterns while building Project Manager:

- Building task boards before the module registry is useful.
- Creating tasks that do not link to a module, feature, API, screen, or database field.
- Treating notes as a replacement for structured fields.
- Marking planned ideas as active.
- Storing API routes without permissions.
- Storing database tables without field-level ownership.
- Creating changelog entries that do not link to work, code, or release.
- Connecting live runtime behavior too early without fallback.
- Creating many labels, statuses, or tabs before the team has a workflow for them.
- Letting GitHub references exist only in comments instead of structured fields.

If the team is unsure what to build next, return to this question:

```text
Will this help someone understand, change, review, test, release, or debug the software?
```

If the answer is no, keep it out of the first version.

## Suggested Future Project Manager Tabs

The current module working area should grow in phases.

Phase 1: registry truth

- Overview
- Features
- Actions
- APIs
- Screens
- Database
- Planning
- Notes
- Activity

Phase 2: delivery management

- Todos
- Tasks
- Issues
- Reviews
- Kanban
- Timeline

Phase 3: release and source traceability

- Changelog
- GitHub
- Releases

Phase 4: governance and portfolio views

- Coverage
- Roadmap
- Milestones
- Dependencies
- Decisions
- Attachments

Keep the most-used tabs visible first. Put heavier governance views behind secondary tabs or dashboards. Avoid showing empty tabs too early; an empty advanced workspace makes the tool feel larger but less useful.

## Design Principle

Project Manager should stay practical.

Prefer clear working records over abstract architecture language. A developer should be able to open a module and immediately understand:

- what it does,
- where it lives,
- how it is protected,
- how it stores data,
- how it is tested,
- what is missing,
- who owns the next step.

That is the maturity target.
