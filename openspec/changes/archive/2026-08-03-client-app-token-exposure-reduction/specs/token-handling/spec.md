# Token Exposure Reduction

## MODIFIED Requirements

### Requirement: JWT MUST be exposed to browser only for Socket.IO

The frontend SHALL retrieve the raw JWT only when establishing a Socket.IO connection. All other use cases (HTTP API calls) MUST use Laravel proxy routes with session-based JWT forwarding.

#### Scenario: Socket.IO connection

- Given a React component needs to establish a Socket.IO connection
- When the component initializes the socket
- Then it MAY call `getSocketAuthToken()` to retrieve the JWT
- And it MUST pass the token via `auth: { token }` Socket.IO option
- And it MUST NOT cache the token outside the socket session

#### Scenario: HTTP data fetch

- Given a React component needs to fetch data
- When the component issues the request
- Then it MUST call a Laravel route via `route('...')`
- And it MUST NOT call `getSocketAuthToken()` for this purpose
- And it MUST NOT include `Authorization: Bearer ...` header

### Requirement: Legacy auth.ts module MUST be removed

The `resources/js/lib/auth.ts` module SHALL be deleted. Its functionality (token storage in browser memory, refresh against Core API) contradicts the BFF design and is dead code.

#### Scenario: Module removal

- Given the legacy `auth.ts` module exists
- When the change is implemented
- Then `resources/js/lib/auth.ts` MUST be deleted
- And no React component MUST import from `@/lib/auth` (other than the new socket-only utility)
- And `resources/js/app.tsx` MUST NOT initialize the legacy auth module
