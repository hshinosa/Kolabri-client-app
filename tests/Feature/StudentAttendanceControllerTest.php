<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class StudentAttendanceControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_attendance_page_returns_zero_percentage_when_all_records_are_excused(): void
    {
        Http::fake([
            'http://localhost:3000/api/courses/course-1' => Http::response([
                'data' => ['id' => 'course-1', 'name' => 'AI Fundamentals'],
            ], 200),
            'http://localhost:3000/api/courses/course-1/my-group' => Http::response([
                'data' => ['id' => 'group-1', 'name' => 'Kelompok A'],
            ], 200),
            'http://localhost:3000/api/groups/group-1/session-discussions' => Http::response([
                'data' => [],
            ], 200),
        ]);

        AttendanceSession::create([
            'id' => 'attendance-session-1',
            'course_id' => 'course-1',
            'group_id' => 'group-1',
            'title' => 'Pertemuan 1',
            'session_date' => now()->toDateString(),
            'created_by' => 'lecturer-1',
        ]);

        AttendanceRecord::create([
            'id' => (string) Str::uuid(),
            'session_id' => 'attendance-session-1',
            'student_id' => 'student-1',
            'student_name' => 'QA Student',
            'student_email' => 'qa@example.com',
            'status' => 'excused',
            'marked_at' => now(),
        ]);

        $this->enrollStudent('student-1', 'course-1');

        $response = $this
            ->withSession($this->studentSessionData('student-1'))
            ->get(route('student.courses.attendance', 'course-1'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('student/courses/attendance')
            ->where('summary.present', 0)
            ->where('summary.absent', 0)
            ->where('summary.excused', 1)
            ->where('summary.total', 1)
            ->where('summary.percentage', 0)
        );
    }
}
