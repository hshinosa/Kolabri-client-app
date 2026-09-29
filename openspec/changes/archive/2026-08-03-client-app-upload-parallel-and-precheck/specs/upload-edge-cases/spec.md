# Upload Edge Cases

## ADDED Requirements

### Requirement: File uploads MUST validate size and MIME client-side before sending

The `uploadAttachments` helper SHALL validate each file's size and MIME type before initiating any upload. Validation failures MUST throw with a descriptive reason and MUST NOT consume bandwidth.

#### Scenario: Oversized file selected

- Given a user selects a 50MB file (limit 10MB)
- When `uploadAttachments` is called
- Then the function MUST throw before any HTTP request is sent
- And the error message MUST include "exceeds 10MB"

#### Scenario: Disallowed MIME type

- Given a user selects an executable file
- When `uploadAttachments` is called
- Then the function MUST throw before any HTTP request is sent
- And the error message MUST include "not allowed"

### Requirement: Multiple file uploads MUST run in parallel with concurrency limit

When multiple files are uploaded together, the helper SHALL upload up to N files concurrently (default N=3) instead of sequentially.

#### Scenario: 5 files uploaded together

- Given a user attaches 5 files
- When `uploadAttachments(files)` runs
- Then at any moment, no more than 3 uploads MUST be in-flight
- And total upload time MUST be approximately `(ceil(5/3)) * single_upload_time` not `5 * single_upload_time`

#### Scenario: Progress events still emitted per file

- Given 5 files uploading in parallel
- When progress events fire
- Then `onProgress` MUST be invoked with `{file, percent}` for each file
- And progress for one file MUST NOT block others
