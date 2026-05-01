<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CourseControllerTest extends TestCase
{
    private function authenticatedSession(string $role = 'lecturer'): self
    {
        return $this->withSession([
            'jwt' => 'test-token',
            'user' => [
                'id' => 'user-1',
                'name' => 'Test User',
                'email' => 'test@example.com',
                'role' => $role,
            ],
        ]);
    }

    public function test_index_renders_courses_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses' => Http::response([
                'data' => [
                    ['id' => 'course-1', 'name' => 'AI Fundamentals', 'code' => 'AI101'],
                ],
            ], 200),
        ]);

        $response = $this->authenticatedSession('lecturer')->get(route('lecturer.courses.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('lecturer/courses/index')
            ->where('courses.0.id', 'course-1')
            ->where('courses.0.name', 'AI Fundamentals')
        );
    }

    public function test_show_renders_course_detail(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI Fundamentals', 'code' => 'AI101'],
            ], 200),
        ]);

        $response = $this->authenticatedSession('lecturer')->get(route('lecturer.courses.show', 'course-1'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('lecturer/courses/show')
            ->where('course.id', 'course-1')
            ->where('course.code', 'AI101')
        );
    }

    public function test_store_creates_course(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses' => Http::response([
                'data' => ['id' => 'course-1'],
            ], 201),
        ]);

        $response = $this->authenticatedSession('lecturer')->post(route('lecturer.courses.store'), [
            'code' => 'AI101',
            'name' => 'AI Fundamentals',
        ]);

        $response->assertRedirect(route('lecturer.courses.index'));
        $response->assertSessionHas('success', 'Course created successfully!');

        Http::assertSent(function ($request) {
            return $request->url() === 'http://localhost:3000/api/courses'
                && $request->method() === 'POST'
                && $request['code'] === 'AI101'
                && $request['name'] === 'AI Fundamentals'
                && $request->hasHeader('Authorization', 'Bearer test-token');
        });
    }

    public function test_join_redirects_student_on_success(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/join' => Http::response([
                'data' => ['id' => 'course-1'],
            ], 200),
        ]);

        $response = $this->authenticatedSession('student')->post(route('student.courses.join'), [
            'join_code' => 'JOIN1234',
        ]);

        $response->assertRedirect(route('student.courses.index'));
        $response->assertSessionHas('success', 'Successfully joined course!');
    }

    public function test_index_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses' => Http::response([
                'error' => 'Server error',
            ], 500),
        ]);

        $response = $this->authenticatedSession('lecturer')->get(route('lecturer.courses.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('lecturer/courses/index')
            ->where('courses', [])
        );
    }
}
