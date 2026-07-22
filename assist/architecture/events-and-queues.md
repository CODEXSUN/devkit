# Events And Queues

## Event-Driven Direction

CODEXSUN should use events to keep modules independent while allowing them to react to important business moments.

Events describe something that already happened.

Important business events should use a database outbox and queue dispatcher strategy.

Examples:

- `tenant.created`
- `subscription.activated`
- `invoice.created`
- `invoice.cancelled`
- `payment.received`
- `stock.adjusted`
- `ewaybill.generated`
- `sync.conflict.detected`
- `ai.analysis.completed`

## Event Rules

- Event names should be stable and descriptive.
- Important events should be persisted in the database outbox.
- Events must include tenant context.
- Events should include correlation ID and actor ID.
- Events should be immutable after publishing.
- Events should not expose private data unless required.
- Event consumers must be idempotent.
- Failed event handling should be retryable or dead-lettered.

## Queue Use Cases

Use queues for:

- Email sending.
- WhatsApp and Telegram messages.
- e-Invoice and e-Way bill calls.
- Data import and export.
- Report generation.
- Sync processing.
- Notification fanout.
- AI analysis jobs.
- Scheduled subscription checks.
- Backup jobs.

## Queue Backend Strategy

CODEXSUN should use Framework queue contracts so queue backends are switchable.

Initial backends:

- BullMQ + Redis for cloud/default deployments.
- Database-backed queue for local and development environments.

Queue backend selection should be visible in Super Admin or system settings. Production backend changes are high-risk and require Super Admin approval.

Current platform implementation:

- `platform.queue-manager` owns `queue_jobs`, Queue Management UI, retry/cancel/run controls, retention cleanup, and the database-backed worker loop.
- Local/development backend is `database`, controlled by `CODEXSUN_QUEUE_BACKEND=database`.
- `bullmq-redis` is connected through BullMQ and Redis using `CODEXSUN_REDIS_URL`; database metadata is still retained so Queue Management can show status, filters, retries, and audit context.
- Database maintenance backup/restore requests enqueue `database-maintenance.run` jobs on the `maintenance` queue.

## Outbox Strategy

Use database outbox for important business events.

Flow:

1. Business transaction succeeds.
2. Event is written to outbox.
3. Dispatcher reads pending outbox events.
4. Dispatcher publishes through selected queue/backend.
5. Consumer handles event idempotently.
6. Outbox status is updated.

This protects business events from being lost between database write and background dispatch.

## Job Rules

- Jobs must include tenant context.
- Jobs should include retry policy.
- Jobs must be idempotent where possible.
- Jobs should log start, finish, failure, and retry.
- Jobs that call external services should store provider response metadata.
- Failed jobs should be visible to support users.
- Completed and failed jobs should follow retention policy and be cleaned by the queue manager.

## Event And Queue Naming

Use lowercase dotted names for events:

- `domain.action`
- `domain.entity.action`

Use clear queue names:

- `mail`
- `integrations`
- `compliance`
- `sync`
- `reports`
- `ai`
- `maintenance`
