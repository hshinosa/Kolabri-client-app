<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AuditLogControllerTest extends TestCase
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

    public function test_index_renders_audit_log_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/audit-logs*' => Http::response([
                'data' => [
                    ['id' => 'log-1', 'action' => 'user.created'],
                ],
                'meta' => [
                    'limit' => 50,
                    'offset' => 0,
                    'total' => 1,
                    'hasMore' => false,
                ],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.audit-log.page'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('admin/audit-log')
            ->where('logs.0.id', 'log-1')
            ->where('meta.total', 1)
            ->where('filters.limit', 50)
        );
    }

    public function test_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/audit-logs*' => Http::response([
                'error' => ['message' => 'Server error'],
            ], 500),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.audit-log.page'));

        $response->assertStatus(500);
        $response->assertJsonPath('error.message', 'Server error');
    }
}
