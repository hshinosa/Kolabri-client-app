<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GroupControllerTest extends TestCase
{
    private function authenticatedSession(string $role = 'lecturer'): self
    {
        return $this->withSession([
            'jwt' => $this->createFakeJwt(['sub' => 'user-1']),
            'user' => [
                'id' => 'user-1',
                'name' => 'Test User',
                'email' => 'test@example.com',
                'role' => $role,
            ],
        ]);
    }

    public function test_index_renders_groups_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI Fundamentals'],
            ], 200),
            'http://localhost:3000/api/courses/course-1/groups' => Http::response([
                'data' => [['id' => 'group-1', 'name' => 'Kelompok A']],
            ], 200),
            'http://localhost:3000/api/courses/course-1/students' => Http::response([
                'data' => [['id' => 'student-1', 'name' => 'Student One']],
            ], 200),
        ]);

        $response = $this->authenticatedSession('lecturer')->get(route('lecturer.groups.index', 'course-1'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('lecturer/groups/index')
            ->where('course.id', 'course-1')
            ->where('groups.0.id', 'group-1')
            ->where('students.0.id', 'student-1')
        );
    }

    public function test_student_groups_index_redirects_to_unified_course_detail(): void
    {
        $this->enrollStudent('user-1', 'course-1');

        $response = $this->authenticatedSession('student')->get(route('student.groups.index', 'course-1'));

        $response->assertRedirect(route('student.courses.show', 'course-1'));
    }

    public function test_store_creates_group(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1/groups' => Http::response([
                'data' => ['id' => 'group-1', 'name' => 'Kelompok A'],
            ], 201),
        ]);

        $response = $this->authenticatedSession('lecturer')->from(route('lecturer.groups.index', 'course-1'))
            ->post(route('lecturer.groups.store', 'course-1'), [
                'name' => 'Kelompok A',
            ]);

        $response->assertRedirect(route('lecturer.groups.index', 'course-1'));
        $response->assertSessionHas('success', 'Grup berhasil dibuat!');
    }

    public function test_join_redirects_back_on_success_without_course_id(): void
    {
        Http::fake([
            'http://localhost:3000/api/groups/join' => Http::response([
                'data' => ['id' => 'group-1', 'name' => 'Kelompok A'],
            ], 200),
        ]);

        $response = $this->authenticatedSession('student')->from(route('student.courses.index'))
            ->post(route('student.groups.join'), [
                'join_code' => 'ABCD1234',
            ]);

        $response->assertRedirect(route('student.courses.index'));
        $response->assertSessionHas('success', 'Berhasil bergabung dengan grup!');
    }

    public function test_join_redirects_to_goal_gate_when_group_response_includes_course_and_open_session(): void
    {
        Http::fake([
            'http://localhost:3000/api/groups/join' => Http::response([
                'data' => [
                    'id' => 'group-1',
                    'name' => 'Kelompok A',
                    'courseId' => 'course-1',
                    'sessionDiscussions' => [
                        [
                            'id' => 'chat-1',
                            'closedAt' => null,
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->authenticatedSession('student')->post(route('student.groups.join'), [
            'join_code' => 'ABCD1234',
        ]);

        $response->assertRedirect(route('student.goals.create', [
            'course' => 'course-1',
            'sessionDiscussion' => 'chat-1',
        ]));
        $response->assertSessionHas('success', 'Berhasil bergabung dengan grup! Silakan tetapkan tujuan pembelajaran Anda.');
    }

    public function test_join_returns_join_specific_error_message_when_request_fails(): void
    {
        Http::fake([
            'http://localhost:3000/api/groups/join' => fn () => throw new \Illuminate\Http\Client\ConnectionException('boom'),
        ]);

        $response = $this->authenticatedSession('student')->from(route('student.courses.index'))
            ->post(route('student.groups.join'), [
                'join_code' => 'ABCD1234',
            ]);

        $response->assertRedirect(route('student.courses.index'));
        $response->assertSessionHasErrors([
            'error' => 'Failed to join group',
        ]);
    }

    public function test_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'error' => 'Server error',
            ], 500),
            'http://localhost:3000/api/courses/course-1/groups' => Http::response([
                'error' => 'Server error',
            ], 500),
            'http://localhost:3000/api/courses/course-1/students' => Http::response([
                'error' => 'Server error',
            ], 500),
        ]);

        $response = $this->authenticatedSession('lecturer')->get(route('lecturer.groups.index', 'course-1'));

        $response->assertNotFound();
    }
}
