<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StudentPreReadGateTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::dropIfExists('user_avatars');
        Schema::create('user_avatars', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id')->unique();
            $table->string('original_path', 500)->nullable();
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('medium_path', 500)->nullable();
            $table->string('large_path', 500)->nullable();
            $table->string('original_filename', 255)->nullable();
            $table->string('mime_type', 50)->nullable();
            $table->unsignedInteger('file_size')->default(0);
            $table->timestamps();
        });
    }

    private function studentSession(): self
    {
        // The assert.enrolled guard requires a course_students row for the
        // session user on every course-scoped student route.
        $this->enrollStudent('11111111-1111-1111-1111-111111111111', 'course-1');

        return $this->withSession($this->studentSessionData('11111111-1111-1111-1111-111111111111'));
    }

    public function test_goal_create_redirects_to_pre_read_when_not_completed(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI'],
            ], 200),
            'http://localhost:3000/api/courses/course-1/my-group' => Http::response([
                'data' => ['id' => 'group-1', 'name' => 'G1'],
            ], 200),
            'http://localhost:3000/api/groups/session-discussions/chat-1' => Http::response([
                'data' => [
                    'id' => 'chat-1',
                    'name' => 'Diskusi',
                    'weekId' => 'week-1',
                    'hasPreReadCompleted' => false,
                    'isClosed' => false,
                    'myGoal' => null,
                ],
            ], 200),
        ]);

        $response = $this->studentSession()->get(route('student.goals.create', [
            'course' => 'course-1',
            'sessionDiscussion' => 'chat-1',
        ]));

        $response->assertRedirect(route('student.session-discussions.pre-read.show', [
            'course' => 'course-1',
            'sessionDiscussion' => 'chat-1',
        ]));
    }

    public function test_chat_room_redirects_to_pre_read_when_not_completed(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI'],
            ], 200),
            'http://localhost:3000/api/courses/course-1/my-group' => Http::response([
                'data' => ['id' => 'group-1', 'name' => 'G1'],
            ], 200),
            'http://localhost:3000/api/groups/session-discussions/chat-1' => Http::response([
                'data' => [
                    'id' => 'chat-1',
                    'name' => 'Diskusi',
                    'weekId' => 'week-1',
                    'hasPreReadCompleted' => false,
                    'isClosed' => false,
                    'myGoal' => ['id' => 'goal-1', 'content' => 'Tujuan'],
                ],
            ], 200),
        ]);

        $response = $this->studentSession()->get(route('student.courses.chat.room', [
            'course' => 'course-1',
            'sessionDiscussion' => 'chat-1',
        ]));

        $response->assertRedirect(route('student.session-discussions.pre-read.show', [
            'course' => 'course-1',
            'sessionDiscussion' => 'chat-1',
        ]));
    }

    public function test_chat_room_uses_session_group_fallback_when_my_group_lookup_fails(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI'],
            ], 200),
            'http://localhost:3000/api/courses/course-1/my-group' => Http::response([
                'error' => 'Group not found',
            ], 404),
            'http://localhost:3000/api/groups/session-discussions/chat-1' => Http::response([
                'data' => [
                    'id' => 'chat-1',
                    'name' => 'Diskusi',
                    'groupId' => 'group-1',
                    'weekId' => null,
                    'hasPreReadCompleted' => true,
                    'isClosed' => true,
                    'myGoal' => ['id' => 'goal-1', 'content' => 'Tujuan'],
                ],
            ], 200),
            'http://localhost:3000/api/groups/group-1' => Http::response([
                'data' => [
                    'id' => 'group-1',
                    'name' => 'G1',
                    'course' => ['id' => 'course-1', 'name' => 'AI'],
                    'members' => [],
                ],
            ], 200),
        ]);

        $response = $this->studentSession()->get(route('student.courses.chat.room', [
            'course' => 'course-1',
            'sessionDiscussion' => 'chat-1',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('student/chat/room')
            ->where('group.id', 'group-1')
            ->where('sessionDiscussion.id', 'chat-1')
        );
    }

    public function test_pre_read_complete_proxies_to_core_api(): void
    {
        Http::fake([
            'http://localhost:3000/api/groups/session-discussions/chat-1/pre-read/complete' => Http::response([
                'data' => ['sessionDiscussionId' => 'chat-1', 'alreadyCompleted' => false],
            ], 200),
            'http://localhost:3000/api/groups/session-discussions/chat-1' => Http::response([
                'data' => [
                    'id' => 'chat-1',
                    'hasPreReadCompleted' => true,
                    'isClosed' => false,
                    'myGoal' => null,
                ],
            ], 200),
        ]);

        $response = $this->studentSession()
            ->from(route('student.session-discussions.pre-read.show', ['course' => 'course-1', 'sessionDiscussion' => 'chat-1']))
            ->post(route('student.session-discussions.pre-read.complete', [
                'course' => 'course-1',
                'sessionDiscussion' => 'chat-1',
            ]));

        $response->assertRedirect(route('student.goals.create', [
            'course' => 'course-1',
            'sessionDiscussion' => 'chat-1',
        ]));

        Http::assertSent(function ($request) {
            return $request->url() === 'http://localhost:3000/api/groups/session-discussions/chat-1/pre-read/complete'
                && $request->method() === 'POST';
        });
    }
}