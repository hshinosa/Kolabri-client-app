## 1. Pre-flight

- [x] 1.1 Run baseline tests, verify Core API close endpoint returns summary in `data.summary` field
- [x] 1.2 Document expected response shape

## 2. Backend pass-through verification

- [x] 2.1 Verify `StudentCourseController::closeSession` returns full Core response unchanged
- [x] 2.2 Add type comment documenting summary field

## 3. Frontend hook update

- [x] 3.1 Add `initialSummary?: ChatDiscussionSummary | null` to `UseChatSummaryOptions`
- [x] 3.2 Initialize state from `initialSummary` if provided
- [x] 3.3 Skip fetch if `initialSummary` truthy
- [x] 3.4 Update existing tests + add test for initial-summary path

## 4. Frontend room.tsx integration

- [x] 4.1 Add `initialSummary` state in `chat/room.tsx`
- [x] 4.2 Capture from `handleCloseSession` response
- [x] 4.3 Convert Core string → `ChatDiscussionSummary` shape
- [x] 4.4 Pass `initialSummary` to `useChatSummary`

## 5. Verify

- [x] 5.1 Manual: close session, verify summary card renders with content
- [x] 5.2 `npx tsc --noEmit` clean
- [x] 5.3 `npx vitest run` passing
- [x] 5.4 `openspec validate client-app-summary-from-close-response --strict`
