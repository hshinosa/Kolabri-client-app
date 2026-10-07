<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthMiddleware
{
    private function decodeJwtPayload(string $token): ?array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3 || empty($parts[2])) {
            return null;
        }

        $payload = $parts[1];
        $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
        $decoded = base64_decode(strtr($payload, '-_', '+/'), true);

        if ($decoded === false) {
            return null;
        }

        $data = json_decode($decoded, true);

        return is_array($data) ? $data : null;
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (!session('jwt') || !session('user')) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            return redirect()->route('auth.login.index')->with('error', 'Please login to continue');
        }

        $payload = $this->decodeJwtPayload((string) session('jwt'));
        $exp = is_array($payload) && isset($payload['exp']) ? (int) $payload['exp'] : null;

        if (!is_array($payload) || $exp === null || !is_numeric($payload['exp']) || $exp <= time()) {
            if (session('refresh_token')) {
                $newToken = $this->proactiveRefresh(session('refresh_token'));

                if ($newToken) {
                    session(['jwt' => $newToken]);
                } else {
                    session()->forget(['jwt', 'refresh_token', 'user']);

                    if ($request->expectsJson()) {
                        return response()->json(['message' => 'Session expired'], 401);
                    }

                    return redirect()->route('auth.login.index')->with('error', 'Session expired');
                }
            } else {
                session()->forget(['jwt', 'refresh_token', 'user']);

                if ($request->expectsJson()) {
                    return response()->json(['message' => 'Session expired or invalid token'], 401);
                }

                return redirect()->route('auth.login.index')->with('error', 'Session expired');
            }
        }

        $request->merge(['auth_user' => session('user')]);

        return $next($request);
    }

    private function proactiveRefresh(string $refreshToken): ?string
    {
        try {
            $baseUrl = config('services.api.base_url', 'http://localhost:3000');

            $response = Http::timeout(10)
                ->connectTimeout(5)
                ->post($baseUrl . '/api/auth/refresh', [
                    'refreshToken' => $refreshToken,
                ]);

            if ($response->successful()) {
                // H6: refresh token dirotasi core-api — simpan token BARU di
                // session, kalau tidak refresh berikutnya dianggap reuse.
                $newRefresh = $response->json('data.refreshToken');
                if (is_string($newRefresh) && $newRefresh !== '') {
                    session(['refresh_token' => $newRefresh]);
                }

                return $response->json('data.accessToken');
            }

            Log::warning('JwtAuthMiddleware: proactive refresh failed', [
                'status' => $response->status(),
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('JwtAuthMiddleware: proactive refresh exception', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
