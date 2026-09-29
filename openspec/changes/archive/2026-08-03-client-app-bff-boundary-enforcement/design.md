# Design

## Audit: Existing Direct-Core Calls

| File | Line | Endpoint | Method | Streaming? |
|---|---|---|---|---|
| `pages/admin/user-management.tsx` | 712 | `/api/users/export` | GET | No (binary) |
| `pages/admin/master-data.tsx` | 1140 | `/api/master/export` | GET | No (binary) |
| `pages/lecturer/analytics/index.tsx` | 225 | `/api/analytics/refresh` | POST | No |
| `pages/student/ai-chat/index.tsx` | 259 | `/api/chat/ai/stream` | POST | YES (SSE) |
| `pages/student/chat/room.tsx` | 751 | `/api/reflections` | POST | No |

## BFF Pattern (Standard)

```typescript
// Frontend (BEFORE)
const token = await getAuthToken();
const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/export`, {
    headers: { Authorization: `Bearer ${token}` },
});

// Frontend (AFTER)
const resp = await fetch(route('admin.users.export'), {
    credentials: 'include', // Laravel session cookie
});
```

```php
// Laravel route
Route::get('/admin/users/export', [UserManagementController::class, 'export'])
    ->name('admin.users.export');

// Controller method
public function export(): StreamedResponse
{
    $response = $this->apiRequest()
        ->withHeaders($this->forwardHeaders())
        ->get('/api/users/export');

    return response()->stream(
        fn () => print($response->body()),
        $response->status(),
        ['Content-Type' => $response->header('Content-Type')],
    );
}
```

## SSE Streaming Proxy

For AI chat (`pages/student/ai-chat/index.tsx:259`):

```php
public function aiChatStream(Request $request): StreamedResponse
{
    return response()->stream(function () use ($request) {
        // Use Guzzle directly for SSE compatibility
        $client = new GuzzleHttpClient(['stream' => true]);
        $coreResponse = $client->post(
            config('services.core_api.url') . '/api/chat/ai/stream',
            [
                'headers' => $this->forwardHeaders(),
                'json' => $request->validated(),
                'stream' => true,
            ],
        );
        $body = $coreResponse->getBody();
        while (!$body->eof()) {
            echo $body->read(8192);
            ob_flush();
            flush();
        }
    }, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
    ]);
}
```

## Forwarding Headers

```php
// app/Http/Controllers/Controller.php (extend)
protected function forwardHeaders(): array
{
    return [
        'Authorization' => 'Bearer ' . session('jwt'),
        'X-Request-ID' => request()->header('X-Request-ID') ?? Str::uuid()->toString(),
    ];
}
```

JWT is read from session on the server side, never sent to browser.

## Migration Strategy

1. Pick 1 site as pilot (recommended: `analytics/index.tsx:225` — simple POST, no streaming)
2. Add Laravel route + controller
3. Update React component
4. Verify e2e (Playwright)
5. Repeat for remaining 4 sites
6. Streaming case (AI chat) last — most complex

## Risk Mitigation

- Add `assert_no_direct_core_calls.test.tsx` static-analysis test using grep to detect future regressions
- Document BFF rule in `docs/architecture.md`
