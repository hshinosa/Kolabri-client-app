<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class UserManagementControllerTest extends TestCase
{
    private function authenticatedSession(): self
    {
        return $this->withSession([
            'jwt' => 'test-token',
            'user' => [
                'id' => 'admin-1',
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'role' => 'admin',
            ],
        ]);
    }

    public function test_index_renders_users_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/users*' => Http::response([
                'data' => [
                    ['id' => 'user-1', 'name' => 'Alice', 'role' => 'student'],
                ],
                'meta' => [
                    'page' => 1,
                    'limit' => 20,
                    'total' => 1,
                    'totalPages' => 1,
                ],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.users.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('admin/user-management')
            ->where('users.0.id', 'user-1')
            ->where('pagination.total', 1)
        );
    }

    public function test_store_creates_user(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/users' => Http::response([
                'data' => ['id' => 'user-2', 'name' => 'Bob'],
            ], 201),
        ]);

        $response = $this->authenticatedSession()->postJson(route('admin.users.store'), [
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'role' => 'student',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.id', 'user-2');
    }

    public function test_update_modifies_user(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/users/user-1' => Http::response([
                'data' => ['id' => 'user-1', 'name' => 'Alice Updated'],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->putJson(route('admin.users.update', 'user-1'), [
            'name' => 'Alice Updated',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'Alice Updated');
    }

    public function test_destroy_deletes_user(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/users/user-1' => Http::response([
                'message' => 'Deleted',
            ], 200),
        ]);

        $response = $this->authenticatedSession()->deleteJson(route('admin.users.destroy', 'user-1'));

        $response->assertOk();
        $response->assertJsonPath('message', 'Deleted');
    }

    public function test_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/users*' => Http::response([
                'error' => 'Server error',
            ], 500),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.users.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('admin/user-management')
            ->where('users', [])
            ->where('pagination.total', 0)
        );
    }
}
