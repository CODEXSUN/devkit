# DevKit agent posting

Use this contract when saving a reviewed agent response to a DevKit project record.

## Before posting an idea

1. Read the project context and the existing `discussion` records for the selected project.
2. Consider only records with `type: "idea"` as existing ideas.
3. Do not create a duplicate when the proposed title matches an existing idea. Refer to the existing idea instead.
4. Keep schema, architecture, notes, modules, tasks, reviews, and changelog records in their own destinations.

## Idea record

- `kind`: `discussion`
- `type`: `idea`
- `referenceId`: selected project ID
- `referenceType`: `project`
- `lane`: `agent:<conversation-id>` or `agent`
- `moduleKey`: one of `general`, `product`, `engineering`, `design`, or `research`
- `status`: `open`
- `key`: unique agent idea key
- `title`: concise outcome-oriented title
- `description`: source conversation, evidence, proposal, risks, and next decision

Ideas are created only by the Agent share workflow. A user may review, edit, link, archive, or promote an existing idea, but project tabs must not create an Idea record as a side effect.

## Other destinations

- Notes: `discussion` with `type: note`
- Module proposals: `discussion` with `type: module-proposal`
- Architecture: `discussion` with `type: architecture`
- Schema: `discussion` with `type: schema`
- Tasks: `task`
- Reviews: `review`
- Changelog: `release`

Apply the same read-before-create and duplicate-check discipline to every destination.
