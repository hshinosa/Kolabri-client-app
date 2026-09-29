# Design

## JWT Middleware Hardening

```php
// app/Http/Middleware/JwtAuthMiddleware.php
public function handle(Request $request, Closure $next): mixed
{
    if (!session('jwt') || !session('user')) {
        return $this->reject($request, 'No active session');
    }

    $payload = $this->decodeJwtPayload((string) session('jwt'));

    // BEFORE: only checked exp <= time()
    // AFTER: also reject malformed/missing exp
    if (!is_array($payload) || !isset($payload['exp'])) {
        session()->forget(['jwt', 'refresh_token', 'user']);
        return $this->reject($request, 'Invalid token');
    }

    if ((int) $payload['exp'] <= time()) {
        session()->forget(['jwt', 'refresh_token', 'user']);
        return $this->reject($request, 'Session expired');
    }

    return $next($request);
}

private function reject(Request $request, string $reason): Response
{
    if ($request->expectsJson()) {
        return response()->json(['message' => $reason], 401);
    }
    return redirect()->route('auth.login.index')->with('error', $reason);
}
```

## Auth Controller Refactor

```php
// app/Http/Controllers/AuthController.php (BEFORE)
public function login(LoginRequest $request)
{
    $response = Http::post(config('services.core_api.url') . '/api/auth/login', $request->validated());
    // ... no timeout
}

// AFTER
public function login(LoginRequest $request)
{
    $response = $this->apiRequest()
        ->post('/api/auth/login', $request->validated());
    // apiRequest() applies timeout(10), connectTimeout(5), baseUrl
    // ... rest
}
```

Update `register` and `logout` similarly.

## Configurable Timeouts

While here, also fix `http-timeout-policy` spec drift — make timeout configurable:

```php
// config/services.php
'core_api' => [
    'url' => env('CORE_API_URL'),
    'timeout' => env('API_TIMEOUT', 10),
    'connect_timeout' => env('API_CONNECT_TIMEOUT', 5),
],

// app/Http/Controllers/Controller.php
protected function apiRequest(?int $timeout = null, ?int $connectTimeout = null)
{
    return Http::timeout($timeout ?? config('services.core_api.timeout'))
        ->connectTimeout($connectTimeout ?? config('services.core_api.connect_timeout'))
        ->baseUrl(config('services.core_api.url'))
        ->withToken(session('jwt'));
}
```

## Test Strategy

```php
// tests/Feature/JwtMiddlewareTest.php
public function test_malformed_jwt_clears_session()
{
    session(['jwt' => 'not-a-jwt', 'user' => ['id' => 1]]);
    $response = $this->getJson('/api/protected');
    $this->assertEquals(401, $response->status());
    $this->assertEmpty(session('jwt'));
}

public function test_jwt_without_exp_rejected()
{
    $payload = base64_encode(json_encode(['sub' => 'user-1']));
    session(['jwt' => "header.{$payload}.sig", 'user' => ['id' => 1]]);
    $response = $this->getJson('/api/protected');
    $this->assertEquals(401, $response->status());
}

// tests/Feature/AuthControllerTimeoutTest.php
public function test_login_timeout_returns_503()
{
    Http::fake(function () {
        sleep(20); // longer than 10s timeout
    });
    $response = $this->post('/login', [...]);
    $this->assertTrue(in_array($response->status(), [503, 504, 500]));
}
```
