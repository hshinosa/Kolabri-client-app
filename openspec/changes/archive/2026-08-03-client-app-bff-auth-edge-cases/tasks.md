## 1. Pre-flight

- [x] 1.1 Run baseline tests
- [x] 1.2 Audit `JwtAuthMiddleware::decodeJwtPayload`
- [x] 1.3 List all `$this->apiRequest()->...` call sites in controllers

## 2. JWT strict 3-part validation

- [x] 2.1 `JwtAuthMiddleware::decodeJwtPayload` — change `count($parts) < 2` to `!== 3`
- [x] 2.2 Validate signature segment non-empty
- [x] 2.3 Add test: 2-part token rejected

## 3. Proxy 401 helper

- [x] 3.1 Add `Controller::proxyResponse()` method
- [x] 3.2 Logic: if Core 401, `session()->forget()` + return JSON 401
- [x] 3.3 Update controllers using `apiRequest()` to call `proxyResponse()`:
  - StudentCourseController::closeSession
  - StudentCourseController::submitReflection
  - StudentCourseController::chatSpaceSummary
  - UserManagementController::exportData
  - MasterDataController::exportData
  - AnalyticsController::liveStats
  - others as needed

## 4. Tests

- [x] 4.1 Test malformed JWT (2-part) → middleware reject
- [x] 4.2 Test Core 401 → session cleared + 401 returned
- [x] 4.3 Test Core 200 → session preserved + response forwarded

## 5. Verify

- [x] 5.1 `vendor/bin/phpunit` passing
- [x] 5.2 `npx vitest run` passing
- [x] 5.3 Manual: simulate Core 401, verify Laravel session cleared
- [x] 5.4 `openspec validate client-app-bff-auth-edge-cases --strict`
