<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AnalyticsControllerTest extends TestCase
{
    private function authenticatedSession(): self
    {
        return $this->withSession([
            'jwt' => 'test-token',
            'user' => [
                'id' => 'user-1',
                'name' => 'Lecturer User',
                'email' => 'lecturer@example.com',
                'role' => 'lecturer',
            ],
        ]);
    }

    public function test_index_renders_analytics_page(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI Fundamentals'],
            ], 200),
            'http://localhost:3000/api/analytics/course/course-1' => Http::response([
                'success' => true,
                'summary' => [
                    'totalGroups' => 2,
                    'averageQualityScore' => 82.5,
                    'totalMessages' => 20,
                    'groupsNeedingAttention' => 0,
                ],
                'groups' => [
                    ['id' => 'group-1', 'qualityScore' => 88],
                ],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('lecturer.analytics.index', 'course-1'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('lecturer/analytics/index')
            ->where('course.id', 'course-1')
            ->where('analytics.summary.totalGroups', 2)
            ->where('analytics.groups.0.id', 'group-1')
        );
    }

    public function test_show_renders_group_analytics(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI Fundamentals'],
            ], 200),
            'http://localhost:3000/api/groups/group-1' => Http::response([
                'data' => ['id' => 'group-1', 'name' => 'Kelompok A'],
            ], 200),
            'http://localhost:3000/api/analytics/group/group-1' => Http::response([
                'success' => true,
                'analytics' => [
                    'qualityScore' => 91,
                    'hotPercentage' => 65,
                    'local_message_count' => 12,
                ],
                'recentActivity' => [['id' => 'activity-1']],
                'members' => [['id' => 'student-1']],
                'chatSpaces' => [['id' => 'chat-1']],
            ], 200),
        ]);

        $response = $this->authenticatedSession()->get(route('lecturer.analytics.group', [
            'course' => 'course-1',
            'group' => 'group-1',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('lecturer/analytics/show')
            ->where('course.id', 'course-1')
            ->where('group.id', 'group-1')
            ->where('analytics.qualityScore', 91)
            ->where('members.0.id', 'student-1')
            ->where('chatSpaces.0.id', 'chat-1')
        );
    }

    public function test_handles_api_error(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI Fundamentals'],
            ], 200),
            'http://localhost:3000/api/analytics/course/course-1' => Http::response([
                'error' => 'Server error',
            ], 500),
        ]);

        $response = $this->authenticatedSession()->get(route('lecturer.analytics.index', 'course-1'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('lecturer/analytics/index')
            ->where('analytics.summary.totalGroups', 0)
            ->where('analytics.groups', [])
        );
    }
}
