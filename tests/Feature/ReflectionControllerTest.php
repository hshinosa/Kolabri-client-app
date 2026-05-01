<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReflectionControllerTest extends TestCase
{
    private function authenticatedSession(): self
    {
        return $this->withSession([
            'jwt' => 'test-token',
            'user' => [
                'id' => 'user-1',
                'name' => 'Test User',
                'email' => 'test@example.com',
                'role' => 'student',
            ],
        ]);
    }

    public function test_index_renders_reflections_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/reflections/me' => Http::response([
                'data' => [['id' => 'reflection-1', 'content' => 'Saya belajar banyak hari ini']],
            ], 200),
            'http://localhost:3000/api/courses/enrolled' => Http::response([
                'data' => [['id' => 'course-1', 'name' => 'AI Fundamentals']],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('student.reflections.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('student/reflections/index')
            ->where('reflections.0.id', 'reflection-1')
            ->where('courses.0.id', 'course-1')
        );
    }

    public function test_store_creates_reflection(): void
    {
        Http::fake([
            'http://localhost:3000/api/reflections' => Http::response([
                'data' => ['id' => 'reflection-1'],
            ], 201),
        ]);

        $response = $this->authenticatedSession()->from(route('student.reflections.index'))
            ->post(route('student.reflections.store'), [
                'goal_id' => 'goal-1',
                'content' => 'Saya memahami bagaimana diskusi kelompok membantu proses belajar saya.',
            ]);

        $response->assertRedirect(route('student.reflections.index'));
        $response->assertSessionHas('success', 'Reflection saved successfully!');
    }

    public function test_index_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/reflections/me' => Http::response(['error' => 'Server error'], 500),
            'http://localhost:3000/api/courses/enrolled' => Http::response(['error' => 'Server error'], 500),
        ]);

        $response = $this->authenticatedSession()->get(route('student.reflections.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('student/reflections/index')
            ->where('reflections', [])
            ->where('courses', [])
        );
    }

    public function test_store_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/reflections' => Http::response([
                'message' => 'Failed to save reflection',
            ], 500),
        ]);

        $response = $this->authenticatedSession()->from(route('student.reflections.index'))
            ->post(route('student.reflections.store'), [
                'content' => 'Saya memahami bagaimana diskusi kelompok membantu proses belajar saya.',
            ]);

        $response->assertRedirect(route('student.reflections.index'));
        $response->assertSessionHasErrors([
            'content' => 'Failed to save reflection',
        ]);
    }
}
