# Attachment URL Allowlist

## ADDED Requirements

### Requirement: Attachment URLs MUST pass scheme validation before render

Any URL rendered as `<img src>`, `<video src>`, or `<a href>` from chat attachments SHALL pass through `safeAttachmentUrl(url)` helper. Non-allowed URLs MUST be replaced with a placeholder.

#### Scenario: javascript: URL in attachment

- Given an attachment payload contains `url: "javascript:alert(1)"`
- When the chat renders the attachment
- Then `<img src>` MUST be set to a placeholder URL
- And the browser MUST NOT execute or fetch the original URL

#### Scenario: Cross-origin tracking pixel

- Given the allowlist excludes `http://attacker.example.com`
- When an attachment with that origin is received
- Then the URL MUST be replaced with placeholder
- And no request to the attacker origin MUST be made

### Requirement: Allowlist MUST be configurable via env

The allowlist of acceptable attachment origins SHALL be readable from `VITE_ATTACHMENT_ALLOWED_ORIGINS` environment variable.

#### Scenario: Production deploy with strict origins

- Given `VITE_ATTACHMENT_ALLOWED_ORIGINS=https://uploads.kolabri.id` is set
- When an attachment URL has origin `https://other.example.com`
- Then the URL MUST be rejected
