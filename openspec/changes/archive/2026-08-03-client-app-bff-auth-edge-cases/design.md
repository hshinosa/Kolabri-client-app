# Design

## 401 Propagation

### Option A: Helper method in Base Controller

```php
// Controller.php
protected function proxyResponse(\Illuminate\Http\Client\Response $response): \Illuminate\Http\JsonResponse
{
    if ($response->status() === 401) {
        // Token revoked by Core API mid-session
        session()->forget(['jwt', 'refresh_token', 'user']);
    }
    return response()->json($response->json(), $response->status());
}
```

Use sites:
```php
$response = $this->apiRequest()->post(...);
return $this->proxyResponse($response);
```

### Option B: Response macro
Add to `AppServiceProvider::boot()`:
```php
Response::macro('proxyToFrontend', function (\Illuminate\Http\Client\Response $response) {
    if ($response->status() === 401) {
        session()->forget(['jwt', 'refresh_token', 'user']);
    }
    return response()->json($response->json(), $response->status());
});
```

Recommended: **Option A** — explicit + testable.

## JWT Strict 3-Part

```php
// Before
if (count($parts) < 2) return null;

// After
if (count($parts) !== 3) return null;

// Also validate signature segment is non-empty
if (empty($parts[2])) return null;
```

## Backward Compatibility

- **401 propagation**: existing JSON 401 responses still work; new behavior is session cleanup. Frontend should already handle 401 (redirect to login). Inertia handles 401 via global exception handler.
- **JWT strict**: any code path that previously created 2-part tokens (test fixtures, debug helpers) needs updating. Audit before merge.

## Tests

```php
// JwtMiddlewareTest
public function test_rejects_2_part_token() {
    session(['jwt' => 'header.payload', 'user' => ['id' => 1]]);
    $response = $this->getJson('/api/protected');
    $this->assertEquals(401, $response->status());
    $this->assertNull(session('jwt'));
}

// ProxyTest
public function test_core_401_clears_session() {
    Http::fake(['*/api/test' => Http::response('', 401)]);
    session(['jwt' => 'valid-token-3-parts.eyJ.sig', 'user' => [...]]);
    $response = $this->postJson('/api/some-proxy-route');
    $this->assertEquals(401, $response->status());
    $this->assertNull(session('jwt'));
}
```
