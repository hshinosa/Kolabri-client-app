<?php

namespace Tests\Feature;

use Tests\TestCase;

class MiddlewareTest extends TestCase
{
    public function test_jwt_auth_redirects_unauthenticated_to_login(): void
    {
        $response = $this->get('/admin/dashboard');
        $response->assertRedirect(route('auth.login.index'));
    }

    public function test_jwt_auth_returns_401_for_json_request(): void
    {
        $response = $this->getJson('/admin/dashboard');
        $response->assertStatus(401);
        $response->assertJson(['message' => 'Unauthenticated']);
    }

    public function test_jwt_auth_allows_authenticated_user(): void
    {
        $response = $this
            ->withSession([
                'jwt' => 'valid-token',
                'user' => ['id' => 'u1', 'name' => 'Admin', 'email' => 'a@test.com', 'role' => 'admin'],
            ])
            ->get('/admin/dashboard');

        $response->assertStatus(200);
    }

    public function test_role_middleware_blocks_wrong_role(): void
    {
        $response = $this
            ->withSession([
                'jwt' => 'valid-token',
                'user' => ['id' => 'u1', 'name' => 'Student', 'email' => 's@test.com', 'role' => 'student'],
            ])
            ->get('/admin/dashboard');

        $response->assertRedirect(route('student.courses.index'));
    }

    public function test_role_middleware_returns_403_for_json(): void
    {
        $response = $this
            ->withSession([
                'jwt' => 'valid-token',
                'user' => ['id' => 'u1', 'name' => 'Student', 'email' => 's@test.com', 'role' => 'student'],
            ])
            ->getJson('/admin/dashboard');

        $response->assertStatus(403);
    }

    public function test_role_middleware_redirects_lecturer_to_courses(): void
    {
        $response = $this
            ->withSession([
                'jwt' => 'valid-token',
                'user' => ['id' => 'u1', 'name' => 'Lecturer', 'email' => 'l@test.com', 'role' => 'lecturer'],
            ])
            ->get('/admin/dashboard');

        $response->assertRedirect(route('lecturer.courses.index'));
    }

    public function test_guest_middleware_redirects_authenticated_student(): void
    {
        $response = $this
            ->withSession([
                'jwt' => 'valid-token',
                'user' => ['id' => 'u1', 'name' => 'Student', 'email' => 's@test.com', 'role' => 'student'],
            ])
            ->get('/login');

        $response->assertRedirect(route('student.courses.index'));
    }

    public function test_guest_middleware_redirects_authenticated_lecturer(): void
    {
        $response = $this
            ->withSession([
                'jwt' => 'valid-token',
                'user' => ['id' => 'u1', 'name' => 'Lecturer', 'email' => 'l@test.com', 'role' => 'lecturer'],
            ])
            ->get('/login');

        $response->assertRedirect(route('lecturer.courses.index'));
    }

    public function test_guest_middleware_allows_unauthenticated(): void
    {
        $response = $this->get('/login');
        $response->assertStatus(200);
    }
}
