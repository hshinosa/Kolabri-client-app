<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    private function authenticatedSession(string $role = 'admin'): self
    {
        return $this->withSession([
            'jwt' => 'test-token',
            'refresh_token' => 'refresh-token',
            'user' => [
                'id' => 'user-1',
                'name' => 'Test User',
                'email' => 'test@example.com',
                'role' => $role,
            ],
        ]);
    }

    public function test_login_redirects_to_dashboard_on_success(): void
    {
        Http::fake([
            'http://localhost:3000/api/auth/login' => Http::response([
                'data' => [
                    'accessToken' => 'jwt-123',
                    'refreshToken' => 'refresh-123',
                    'user' => [
                        'id' => 'user-1',
                        'name' => 'Admin User',
                        'email' => 'admin@example.com',
                        'role' => 'admin',
                    ],
                ],
            ], 200),
        ]);

        $response = $this->post(route('auth.login.post'), [
            'email' => 'admin@example.com',
            'password' => 'secret123',
        ]);

        $response->assertRedirect(route('admin.dashboard'));
        $response->assertSessionHas('success', 'Welcome back!');
        $response->assertSessionHas('jwt', 'jwt-123');
        $response->assertSessionHas('refresh_token', 'refresh-123');
        $response->assertSessionHas('user.role', 'admin');
    }

    public function test_login_shows_error_on_invalid_credentials(): void
    {
        Http::fake([
            'http://localhost:3000/api/auth/login' => Http::response([
                'message' => 'Invalid credentials',
            ], 401),
        ]);

        $response = $this->from(route('auth.login.index'))->post(route('auth.login.post'), [
            'email' => 'admin@example.com',
            'password' => 'wrongpass',
        ]);

        $response->assertRedirect(route('auth.login.index'));
        $response->assertSessionHasErrors([
            'email' => 'Invalid credentials',
        ]);
    }

    public function test_register_creates_user_and_redirects(): void
    {
        Http::fake([
            'http://localhost:3000/api/auth/register' => Http::response([
                'data' => [
                    'accessToken' => 'jwt-456',
                    'refreshToken' => 'refresh-456',
                    'user' => [
                        'id' => 'user-2',
                        'name' => 'Lecturer User',
                        'email' => 'lecturer@example.com',
                        'role' => 'lecturer',
                    ],
                ],
            ], 200),
        ]);

        $response = $this->post(route('auth.register.post'), [
            'name' => 'Lecturer User',
            'email' => 'lecturer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'lecturer',
        ]);

        $response->assertRedirect(route('lecturer.courses.index'));
        $response->assertSessionHas('success', 'Account created successfully!');
        $response->assertSessionHas('jwt', 'jwt-456');
        $response->assertSessionHas('user.role', 'lecturer');
    }

    public function test_logout_clears_session(): void
    {
        Http::fake([
            'http://localhost:3000/api/auth/logout' => Http::response([
                'message' => 'Logged out',
            ], 200),
        ]);

        $response = $this->authenticatedSession()->post(route('auth.logout'));

        $response->assertRedirect(route('auth.login.index'));
        $response->assertSessionHas('success', 'Logged out successfully');
        $response->assertSessionMissing('jwt');
        $response->assertSessionMissing('refresh_token');
        $response->assertSessionMissing('user');

        Http::assertSent(function ($request) {
            return $request->url() === 'http://localhost:3000/api/auth/logout'
                && $request->method() === 'POST'
                && $request['refreshToken'] === 'refresh-token';
        });
    }

    public function test_unauthenticated_redirects_to_login(): void
    {
        $response = $this->get(route('dashboard'));

        $response->assertRedirect(route('auth.login.index'));
        $response->assertSessionHas('error', 'Please login to continue');
    }
}
