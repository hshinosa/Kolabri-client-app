<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AISettingsControllerTest extends TestCase
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

    public function test_index_renders_settings_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/ai-providers*' => Http::response([
                'data' => [
                    ['id' => 'provider-1', 'name' => 'OpenAI'],
                ],
                'meta' => ['total' => 1],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.ai-settings.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('admin/ai-settings')
            ->where('providers.0.id', 'provider-1')
            ->where('meta.total', 1)
        );
    }

    public function test_store_creates_provider(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/ai-providers' => Http::response([
                'data' => ['id' => 'provider-2', 'name' => 'Anthropic'],
            ], 201),
        ]);

        $response = $this->authenticatedSession()->postJson(route('admin.ai-settings.store'), [
            'name' => 'Anthropic',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.id', 'provider-2');
    }

    public function test_update_modifies_provider(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/ai-providers/provider-1' => Http::response([
                'data' => ['id' => 'provider-1', 'name' => 'OpenAI Updated'],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->putJson(route('admin.ai-settings.update', 'provider-1'), [
            'name' => 'OpenAI Updated',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'OpenAI Updated');
    }

    public function test_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/ai-providers*' => Http::response([
                'error' => ['message' => 'Server error'],
            ], 500),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.ai-settings.index'));

        $response->assertStatus(500);
        $response->assertJsonPath('error.message', 'Server error');
    }
}
