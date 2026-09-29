# BFF Pattern Enforcement

## ADDED Requirements

### Requirement: Frontend MUST NOT call Core API directly

React components SHALL NOT make HTTP requests to Core API URL (`VITE_API_BASE_URL` or similar). All data calls MUST go through Laravel routes that proxy to Core API server-side.

#### Scenario: New page needs Core data

- Given a developer adds a new page that needs data from Core API
- When implementing the data fetching
- Then the developer MUST add a Laravel route + controller method
- And the React component MUST call the Laravel route via `route('...')`
- And MUST NOT include `Authorization: Bearer ...` header from frontend
- And MUST NOT use `import.meta.env.VITE_API_BASE_URL` for fetch URLs

#### Scenario: Streaming endpoint

- Given a Core API endpoint returns Server-Sent Events
- When the frontend needs to consume the stream
- Then a Laravel route MUST exist that proxies the stream via `response()->stream()`
- And the React component MUST connect to the Laravel route
- And the JWT MUST be forwarded from Laravel session to Core, never exposed to browser

### Requirement: JWT token MUST stay on server side

The frontend SHALL NOT receive the raw JWT for direct Core API authentication. Where Socket.IO requires the token (via `auth: { token }`), the token MUST be retrieved via `/api/auth/token` ONLY for that specific use case.

#### Scenario: Component needs to call Core API

- Given a React component needs to send data to Core API
- When the component initiates the request
- Then the component MUST call a Laravel route (not Core directly)
- And the JWT MUST NOT appear in browser network tab Authorization header
- And the JWT MUST NOT be retrieved via `getAuthToken()` for this purpose

#### Scenario: Socket.IO needs JWT (allowed exception)

- Given the Socket.IO client requires JWT for handshake auth
- When establishing the socket connection
- Then `getAuthToken()` MAY be called to retrieve the token
- And the token MUST be passed via `io(url, { auth: { token } })`
- And the token MUST NOT be cached longer than the socket session
