# Messenger module

Messenger is a DevKit bounded module for private user conversations.

## Layers

- `domain` owns direct-conversation identity, participant rules, and message rules.
- `messenger.service.ts` applies use cases and active-user policy.
- `messenger.routes.ts` adapts authenticated HTTP requests and response contracts.
- `messenger.repository.ts` stores conversations, participants, messages, receipts, and activity.
- `messenger.runtime.ts` publishes process-local realtime events to the Platform socket adapter.
- `messenger.storage.ts` owns private attachment files and validation.

Platform supplies active user references through the DevKit host actor contract. Messenger clients
use `/api/devkit/messenger/contacts`. They do not read Platform identity routes directly.

Web, desktop, and mobile use the same direct-conversation API. The client kind records the sending
surface. It does not define message ownership. The signed-in user defines ownership.

The separate device conversation remains a compatibility feature. User Messenger uses direct
conversations only.

## Security

- The server verifies all REST and Socket.IO authentication tokens.
- The server disconnects a Messenger socket when its verified token expires.
- Write rate limits apply per actor and action on each API process.
- Attachment downloads require conversation membership and use private no-store responses.
- Attachment responses use download disposition, content sniffing protection, and a sandbox policy.
- Upload validation accepts raster images, PDF files, and text files with matching content.

The current deployment uses one API instance. Redis Socket.IO fan-out remains future work for an
approved multi-instance deployment. Malware scanning requires a configured scanner before it can
become an upload requirement.

## Package extraction seam

A later package can move the domain types, client contracts, and application ports. The DevKit
module keeps persistence and host composition until an approved package boundary exists.
