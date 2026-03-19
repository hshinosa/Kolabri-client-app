<?php

namespace Tests\Feature\Lecturer;

use Tests\TestCase;

class LecturerShellNavigationTest extends TestCase
{
    public function test_dashboard_route_renders_lecturer_dashboard_for_lecturer_session(): void
    {
        $response = $this
            ->withSession([
                'jwt' => 'lecturer-token',
                'user' => [
                    'id' => 'lecturer-1',
                    'name' => 'QA Lecturer',
                    'email' => 'lecturer@example.com',
                    'role' => 'lecturer',
                ],
            ])
            ->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('lecturer/dashboard')
            ->where('auth.user.role', 'lecturer')
            ->where('auth.user.name', 'QA Lecturer')
        );
    }

    public function test_dashboard_route_renders_student_dashboard_for_student_session(): void
    {
        $response = $this
            ->withSession([
                'jwt' => 'student-token',
                'user' => [
                    'id' => 'student-1',
                    'name' => 'QA Student',
                    'email' => 'student@example.com',
                    'role' => 'student',
                ],
            ])
            ->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('student/dashboard')
            ->where('auth.user.role', 'student')
            ->where('auth.user.name', 'QA Student')
        );
    }
}
