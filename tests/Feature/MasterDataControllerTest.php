<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MasterDataControllerTest extends TestCase
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

    public function test_index_renders_master_data_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/courses*' => Http::response([
                'data' => [
                    'courses' => [
                        ['id' => 'course-1', 'name' => 'AI Fundamentals'],
                    ],
                    'pagination' => [
                        'page' => 1,
                        'limit' => 10,
                        'total' => 1,
                        'totalPages' => 1,
                    ],
                ],
            ], 200),
            'http://localhost:3000/api/admin/users*' => Http::response([
                'data' => [
                    'users' => [
                        ['id' => 'lecturer-1', 'name' => 'Dr. Smith'],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.master-data.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('admin/master-data')
            ->where('courses.0.id', 'course-1')
            ->where('lecturers.0.id', 'lecturer-1')
            ->where('tab', 'active')
        );
    }

    public function test_store_creates_course(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/courses' => Http::response([
                'data' => ['id' => 'course-2', 'name' => 'Data Mining'],
            ], 201),
        ]);

        $response = $this->authenticatedSession()->postJson(route('admin.master-data.store'), [
            'name' => 'Data Mining',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.id', 'course-2');
    }

    public function test_update_modifies_course(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'Data Mining Lanjut'],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->putJson(route('admin.master-data.update', 'course-1'), [
            'name' => 'Data Mining Lanjut',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'Data Mining Lanjut');
    }

    public function test_destroy_deletes_course(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/courses/course-1' => Http::response([
                'message' => 'Deleted',
            ], 200),
        ]);

        $response = $this->authenticatedSession()->deleteJson(route('admin.master-data.destroy', 'course-1'));

        $response->assertOk();
        $response->assertJsonPath('message', 'Deleted');
    }

    public function test_templates_page_renders(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/course-templates' => Http::response([
                'data' => [
                    ['id' => 'template-1', 'name' => 'Template A'],
                ],
            ], 200),
            'http://localhost:3000/api/admin/users*' => Http::response([
                'data' => [
                    'users' => [
                        ['id' => 'lecturer-1', 'name' => 'Dr. Smith'],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.templates'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('admin/templates')
            ->where('templates.0.id', 'template-1')
            ->where('lecturers.0.id', 'lecturer-1')
        );
    }

    public function test_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/admin/courses*' => Http::response(['error' => 'Server error'], 500),
            'http://localhost:3000/api/admin/users*' => Http::response(['error' => 'Server error'], 500),
        ]);

        $response = $this->authenticatedSession()->get(route('admin.master-data.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('admin/master-data')
            ->where('courses', [])
            ->where('lecturers', [])
        );
    }
}
