<?php

namespace App\Http\Controllers;

use App\Models\UserPreference;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /**
     * Show Login Page
     */
    public function showLogin(): Response
    {
        return Inertia::render('auth/login');
    }

    /**
     * Handle Login Request
     * Laravel acts as BFF - proxies to Express API, stores JWT in session
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|min:6',
            'remember' => 'boolean',
        ]);

        try {
            $response = $this->coreApiRequest()->post($this->apiUrl() . '/api/auth/login', [
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);

            if ($response->successful()) {
                $data = $response->json('data');

                // M1 (session fixation): rotate session ID BEFORE storing auth state
                session()->regenerate(true);

                session([
                    'jwt' => $data['accessToken'],
                    'refresh_token' => $data['refreshToken'],
                    'user' => $data['user'],
                    'remember_me' => $validated['remember'] ?? false,
                ]);

                UserPreference::firstOrCreate(
                    ['user_id' => $data['user']['id']],
                    UserPreference::defaultsFor($data['user']['id'])
                );

                $redirectRoute = $data['user']['role'] === 'admin'
                    ? 'admin.dashboard'
                    : ($data['user']['role'] === 'lecturer'
                        ? 'dashboard'
                        : 'student.courses.index');

                return redirect()->route($redirectRoute)->with('success', 'Welcome back!');
            }

            // Handle specific error cases
            $statusCode = $response->status();
            $apiMessage = $response->json('message', '');
            $apiError = $response->json('error.message', '');

            // Unverified email
            if ($statusCode === 403 && str_contains(strtolower($apiMessage . $apiError), 'verif')) {
                return back()->withErrors([
                    'email' => 'Silakan verifikasi email Anda terlebih dahulu. Periksa kotak masuk Anda.',
                ])->with('showResendVerification', true)->with('verificationEmail', $validated['email']);
            }

            // Rate limited by API
            if ($statusCode === 429) {
                return back()->withErrors([
                    'email' => 'Terlalu banyak percobaan login. Silakan tunggu beberapa saat dan coba lagi.',
                ]);
            }

            return back()->withErrors([
                'email' => $apiMessage ?: 'Email atau password salah',
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Login connection failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'email' => 'Tidak dapat terhubung ke layanan autentikasi. Periksa koneksi internet Anda.',
            ]);
        } catch (ConnectionException $e) {
            Log::error('Login failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'email' => 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
            ]);
        } catch (RequestException $e) {
            Log::error('Login failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'email' => 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
            ]);
        }
    }

    /**
     * Show Register Page
     */
    public function showRegister(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle Register Request
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|min:2|max:255',
            'email' => 'required|email|max:255',
            'password' => 'required|min:8|confirmed',
            // Admin tidak boleh dari registrasi publik (blok eskalasi privilese)
            'role' => 'required|in:lecturer,student',
            'terms' => 'accepted',
        ]);

        try {
            $response = $this->coreApiRequest()->post($this->apiUrl() . '/api/auth/register', [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role' => $validated['role'],
            ]);

            if ($response->successful()) {
                $data = $response->json('data');

                // Check if email verification is required
                if (isset($data['requiresVerification']) && $data['requiresVerification']) {
                    return redirect()->route('auth.verify-email.notice')
                        ->with('email', $validated['email'])
                        ->with('success', 'Akun berhasil dibuat! Silakan cek email Anda untuk verifikasi.');
                }

                session()->regenerate(true);

                session([
                    'jwt' => $data['accessToken'],
                    'refresh_token' => $data['refreshToken'],
                    'user' => $data['user'],
                ]);

                UserPreference::firstOrCreate(
                    ['user_id' => $data['user']['id']],
                    UserPreference::defaultsFor($data['user']['id'])
                );

                $redirectRoute = $data['user']['role'] === 'admin'
                    ? 'admin.dashboard'
                    : ($data['user']['role'] === 'lecturer'
                        ? 'dashboard'
                        : 'student.courses.index');

                return redirect()->route($redirectRoute)->with('success', 'Akun berhasil dibuat!');
            }

            // Handle validation errors from API
            $statusCode = $response->status();
            $errorBody = $response->json('error');
            $apiMessage = $errorBody['message'] ?? $response->json('message', '');

            if ($statusCode === 409 || str_contains(strtolower($apiMessage), 'already') || str_contains(strtolower($apiMessage), 'exists')) {
                return back()->withErrors([
                    'email' => 'Email sudah terdaftar. Silakan login atau gunakan email lain.',
                ]);
            }

            if ($statusCode === 422 || $statusCode === 400) {
                if (isset($errorBody['details'])) {
                    return back()->withErrors($errorBody['details']);
                }
                return back()->withErrors([
                    'email' => $apiMessage ?: 'Data registrasi tidak valid.',
                ]);
            }

            if ($statusCode === 429) {
                return back()->withErrors([
                    'email' => 'Terlalu banyak percobaan registrasi. Silakan tunggu beberapa saat.',
                ]);
            }

            return back()->withErrors([
                'email' => 'Terjadi kesalahan saat registrasi. Silakan coba lagi.',
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Registration connection failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'email' => 'Tidak dapat terhubung ke layanan autentikasi. Periksa koneksi internet Anda.',
            ]);
        } catch (ConnectionException $e) {
            Log::error('Registration failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'email' => 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
            ]);
        } catch (RequestException $e) {
            Log::error('Registration failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'email' => 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
            ]);
        }
    }

    /**
     * Handle Logout
     */
    public function logout(Request $request)
    {
        $refreshToken = session('refresh_token');
        
        if ($refreshToken) {
            try {
                $this->coreApiRequest()->post($this->apiUrl() . '/api/auth/logout', [
                    'refreshToken' => $refreshToken,
                ]);
            } catch (ConnectionException $e) {
                Log::error('Logout API call failed', ['error' => $e->getMessage()]);
            } catch (RequestException $e) {
                Log::error('Logout API call failed', ['error' => $e->getMessage()]);
            }
        }

        session()->forget(['jwt', 'refresh_token', 'user']);
        session()->invalidate();
        session()->regenerateToken();

        return redirect()->route('auth.login.index')->with('success', 'Anda telah berhasil keluar.');
    }

    /**
     * Get JWT token for authenticated user
     * Used by frontend for Socket.IO and real-time features
     */
    public function getToken(Request $request)
    {
        $token = session('jwt');

        if (!$token) {
            return response()->json([
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'No active session',
                ],
            ], 401);
        }

        return response()->json([
            'data' => [
                'token' => $token,
            ],
        ]);
    }

    public function refreshToken(Request $request)
    {
        $refreshToken = session('refresh_token');

        if (!$refreshToken) {
            return response()->json([
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'No refresh token available',
                ],
            ], 401);
        }

        try {
            $response = $this->coreApiRequest()->post($this->apiUrl() . '/api/auth/refresh', [
                'refreshToken' => $refreshToken,
            ]);

            if ($response->successful()) {
                $newAccessToken = $response->json('data.accessToken');
                $newRefreshToken = $response->json('data.refreshToken');
                $sessionData = ['jwt' => $newAccessToken];
                // H6: refresh token dirotasi core-api — wajib simpan yang baru,
                // kalau tidak request refresh berikutnya kena deteksi reuse.
                if (is_string($newRefreshToken) && $newRefreshToken !== '') {
                    $sessionData['refresh_token'] = $newRefreshToken;
                }
                session($sessionData);

                return response()->json([
                    'data' => [
                        'token' => $newAccessToken,
                    ],
                ]);
            }

            session()->forget(['jwt', 'refresh_token', 'user']);

            return response()->json([
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Token refresh failed',
                ],
            ], 401);
        } catch (ConnectionException $e) {
            Log::error('Token refresh failed', ['error' => $e->getMessage()]);

            session()->forget(['jwt', 'refresh_token', 'user']);

            return response()->json([
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Token refresh failed',
                ],
            ], 401);
        } catch (RequestException $e) {
            Log::error('Token refresh failed', ['error' => $e->getMessage()]);

            session()->forget(['jwt', 'refresh_token', 'user']);

            return response()->json([
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Token refresh failed',
                ],
            ], 401);
        }
    }
}
