# Chat Architecture

## ADDED Requirements

### Requirement: Chat types MUST live in single source

Chat-related TypeScript interfaces (`DisplayMessage`, `ChatAttachment`, `ReplyContext`, socket event types) SHALL be declared in `resources/js/types/chat.ts`. Components MUST import from there.

#### Scenario: Add field to DisplayMessage

- Given a developer adds a new field to `DisplayMessage`
- When they edit `resources/js/types/chat.ts`
- Then all files using `DisplayMessage` MUST automatically have the new field
- And no duplicate `interface DisplayMessage` MAY exist elsewhere

### Requirement: Chat room MUST use ChatMessageList

`resources/js/pages/student/chat/room.tsx` SHALL render messages via `<ChatMessageList />` component. Inline `messages.map(...)` JSX MUST NOT exist for the message list.

#### Scenario: Render messages

- Given `room.tsx` displays `processedMessages`
- When the component returns JSX for the message list
- Then it MUST render `<ChatMessageList messages={...} ... />`
- And MUST NOT use inline `{processedMessages.map((message) => <motion.div>...</motion.div>)}`

### Requirement: chat/index.tsx MUST use useSocketRoom hook

`resources/js/pages/student/chat/index.tsx` SHALL use the `useSocketRoom` hook for socket lifecycle. Direct `io(url, ...)` calls in this file MUST NOT exist.

#### Scenario: Refactor verification

- Given `chat/index.tsx` is refactored
- When grep checks for `io\(` in the file
- Then there MUST be 0 matches
- And the file MUST import `useSocketRoom`

## MODIFIED Requirements

### Requirement: Message list keys MUST be stable

Every `<motion.div key={...}>` or list item in chat MUST use `message.id` only. Index-based fallback (`message.id || index`) MUST NOT be used.

#### Scenario: Optimistic message before server ack

- Given a user sends a message and renders optimistic UI
- When the optimistic message is added to state
- Then the message MUST already have an `id` (e.g., `optim-${nanoid()}`)
- And the list `key` MUST be `message.id` only
