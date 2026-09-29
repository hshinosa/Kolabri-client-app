# Chat Correctness Regression Fixes

## ADDED Requirements

### Requirement: Chat room MUST reconcile optimistic messages

`chat/room.tsx` SHALL use `reconcileIncomingMessage` in its `onMessageReceived` callback so server-echoed messages replace pending optimistic placeholders instead of being appended as duplicates.

#### Scenario: Server echoes optimistic send

- Given user sends a message via `emitChatMessage` creating an optimistic entry with `clientId="optim-X"`
- When the server broadcasts the persisted message back with `clientId="optim-X"` and `id="srv-Y"`
- Then `onMessageReceived` MUST call `reconcileIncomingMessage(prev, raw)`
- And the message list MUST contain only one entry with `id="srv-Y"` and `status="sent"`
- And the optimistic placeholder MUST NOT remain alongside the confirmed message

### Requirement: Pending file ObjectURLs MUST be revoked

When pending files are cleared (after send) or the chat component unmounts, every preview ObjectURL SHALL be revoked via `URL.revokeObjectURL`.

#### Scenario: Successful send clears pending files

- Given user has 3 pending files with preview ObjectURLs
- When the user sends the message and `setPendingFiles([])` is called
- Then `URL.revokeObjectURL` MUST be invoked for each preview URL before the array is cleared
- And no orphan ObjectURL MUST remain in browser memory

#### Scenario: Component unmounts with pending files

- Given user has selected files but not yet sent
- When user navigates away and the component unmounts
- Then the cleanup effect MUST revoke all preview ObjectURLs
- And no setState MUST be called after unmount

### Requirement: OpenSpec task status MUST reflect actual implementation

Tasks marked `[x]` in any `tasks.md` SHALL correspond to verified code in the working tree. If a task is partially done or deferred to another change, it MUST remain `[ ]` with a note pointing to the spec where it will be completed.

#### Scenario: Task completion claim verification

- Given a developer marks a task `[x]` in tasks.md
- When the task targets specific code (e.g., "Add Laravel proxy route X")
- Then the corresponding code MUST exist (route registered, controller method present)
- And `grep` for the route MUST return a hit
- Otherwise the mark MUST stay `[ ]`
