# Attachment Uploads

## ADDED Requirements

### Requirement: File attachments MUST upload via HTTP

Chat attachments SHALL be uploaded via HTTP POST to a Laravel route (`/api/upload`). Base64-encoded file content MUST NOT be transmitted via Socket.IO frames.

#### Scenario: User attaches image

- Given a user selects an image to attach to a message
- When the user clicks send
- Then the image file MUST be uploaded via `POST /api/upload`
- And the response MUST contain attachment metadata `{ id, url, size, mime_type }`
- And the `send_message` Socket.IO event MUST include only the metadata
- And MUST NOT include base64 file data

### Requirement: Upload SHOULD report progress

The upload helper SHALL emit progress events so the UI can render upload state.

#### Scenario: Slow upload connection

- Given a 8MB file uploads on a 1Mbps connection
- When upload is in progress
- Then the UI MUST display percentage progress
- And the send button MUST be disabled until upload completes or fails

### Requirement: ObjectURL previews MUST be revoked

When pending file list is cleared (after send or cancel), all preview ObjectURLs SHALL be revoked.

#### Scenario: Send cancellation

- Given pending files with preview ObjectURLs
- When the user clears the file selection
- Then `URL.revokeObjectURL(previewUrl)` MUST be called for each file
- And the URLs MUST NOT leak in browser memory
