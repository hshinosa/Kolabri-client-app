<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoalControllerTest extends TestCase
{
    private function authenticatedSession(string $role = 'student'): self
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

    public function test_create_renders_goals_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI Fundamentals'],
            ], 200),
            'http://localhost:3000/api/courses/course-1/my-group' => Http::response([
                'data' => ['id' => 'group-1', 'name' => 'Kelompok A'],
            ], 200),
            'http://localhost:3000/api/groups/chat-spaces/chat-1' => Http::response([
                'data' => ['id' => 'chat-1', 'name' => 'Diskusi 1', 'myGoal' => null],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('student.goals.create', [
            'course' => 'course-1',
            'chatSpace' => 'chat-1',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('student/goals/create')
            ->where('course.id', 'course-1')
            ->where('group.id', 'group-1')
            ->where('chatSpace.id', 'chat-1')
        );
    }

    public function test_create_redirects_when_goal_already_exists(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI Fundamentals'],
            ], 200),
            'http://localhost:3000/api/courses/course-1/my-group' => Http::response([
                'data' => ['id' => 'group-1', 'name' => 'Kelompok A'],
            ], 200),
            'http://localhost:3000/api/groups/chat-spaces/chat-1' => Http::response([
                'data' => ['id' => 'chat-1', 'myGoal' => ['id' => 'goal-1']],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('student.goals.create', [
            'course' => 'course-1',
            'chatSpace' => 'chat-1',
        ]));

        $response->assertRedirect(route('student.courses.chat-spaces', ['course' => 'course-1']));
        $response->assertSessionHas('info', 'Goal sudah ditetapkan oleh anggota grup lain. Silakan masuk ke sesi diskusi.');
    }

    public function test_store_creates_goal(): void
    {
        Http::fake([
            'http://localhost:3000/api/goals' => Http::response([
                'data' => ['id' => 'goal-1'],
            ], 201),
        ]);

        $response = $this->authenticatedSession()->from(route('student.courses.index'))
            ->post(route('student.goals.store'), [
                'chat_space_id' => 'chat-1',
                'content' => 'Mahasiswa akan menganalisis pola diskusi kelompok untuk memahami kualitas kolaborasi.',
            ]);

        $response->assertRedirect(route('student.courses.index'));
        $response->assertSessionHas('success', 'Learning goal saved! You can now access the chat.');
    }

    public function test_store_rejects_goal_without_action_verb(): void
    {
        $response = $this->authenticatedSession()->from(route('student.courses.index'))
            ->post(route('student.goals.store'), [
                'chat_space_id' => 'chat-1',
                'content' => 'Tujuan pembelajaran ini berisi kalimat panjang tanpa kata kerja aksi yang sesuai.',
            ]);

        $response->assertRedirect(route('student.courses.index'));
        $response->assertSessionHasErrors([
            'content' => 'Tujuan harus mengandung kata kerja aksi dari Taksonomi Bloom (misalnya: menganalisis, merancang, membandingkan)',
        ]);
    }

    public function test_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/goals' => Http::response([
                'message' => 'Server error',
            ], 500),
        ]);

        $response = $this->authenticatedSession()->from(route('student.courses.index'))
            ->post(route('student.goals.store'), [
                'chat_space_id' => 'chat-1',
                'content' => 'Mahasiswa akan menganalisis data diskusi kelompok untuk meningkatkan refleksi belajar.',
            ]);

        $response->assertRedirect(route('student.courses.index'));
        $response->assertSessionHasErrors([
            'content' => 'Server error',
        ]);
    }
}
