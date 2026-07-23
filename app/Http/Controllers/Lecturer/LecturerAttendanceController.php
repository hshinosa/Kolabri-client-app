<?php

namespace App\Http\Controllers\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Course;
use App\Models\CourseWeek;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LecturerAttendanceController extends Controller
{
    /**
     * List attendance sessions for a course with summary stats.
     * Groups by: sessions with weekId (by week), sessions without weekId ("Sesi Lainnya"),
     * and open session discussions from core-api ("Sedang Berjalan").
     */
    public function index(string $course): JsonResponse
    {
        // Verify lecturer owns the course
        $courseModel = Course::where('id', $course)->first();
        if (!$courseModel || $courseModel->lecturer_id !== session('user.id')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Get group mapping + membership (group_id UUID → label, member lists)
        $groupMap = [];
        $groupMembers = []; // label → [studentId, ...]
        try {
            $groupResponse = $this->apiRequest(10)->get($this->apiUrl() . "/api/courses/{$course}/groups");
            if ($groupResponse->successful()) {
                foreach ($groupResponse->json('data', []) as $g) {
                    $name = $g['name'] ?? '';
                    $letter = preg_match('/Kelompok\s+(\w+)/i', $name, $m) ? $m[1] : substr($name, 0, 1);
                    $groupMap[$g['id']] = $letter;
                    $memberIds = [];
                    foreach ($g['members'] ?? [] as $member) {
                        $memberIds[] = $member['userId'] ?? $member['id'] ?? null;
                    }
                    $groupMembers[$letter] = array_filter($memberIds);
                }
            }
        } catch (\Exception $e) {
            // Group mapping is optional — continue with empty maps
        }

        // Query attendance sessions with eager loading (fix N+1)
        $sessions = AttendanceSession::where('course_id', $course)
            ->with(['records' => function ($q) {
                $q->select('session_id', 'status', DB::raw('COUNT(*) as count'))
                  ->groupBy('session_id', 'status');
            }])
            ->orderBy('created_at', 'desc')
            ->get();

        // Group sessions by week
        $byWeek = [];
        $other = [];

        foreach ($sessions as $session) {
            $stats = [
                'id' => $session->id,
                'title' => $session->title,
                'session_date' => $session->session_date,
                'session_number' => $session->session_number,
                'auto_generated' => $session->auto_generated,
                'attendance_method' => $session->attendance_method,
                'session_discussion_id' => $session->session_discussion_id,
                'week_id' => $session->week_id,
                'group_id' => $session->group_id,
                'group_label' => $session->group_id ? ($groupMap[$session->group_id] ?? null) : null,
                'total_students' => $session->total_students,
                'present_count' => $session->present_count,
                'absent_count' => $session->absent_count,
                'excused_count' => $session->excused_count,
                'marked_count' => $session->marked_count,
                'attendance_rate' => $session->attendance_rate,
                'created_at' => $session->created_at,
            ];

            if ($session->week_id) {
                if (!isset($byWeek[$session->week_id])) {
                    $byWeek[$session->week_id] = [];
                }
                $byWeek[$session->week_id][] = $stats;
            } else {
                $other[] = $stats;
            }
        }

        // Query core-api for open session discussions (closedAt = null)
        $runningResponse = $this->apiRequest()->get($this->apiUrl() . "/api/courses/{$course}/session-discussions", [
            'status' => 'active',
        ]);

        $running = [];
        if ($runningResponse->successful()) {
            $discussions = $runningResponse->json('data', []);
            foreach ($discussions as $disc) {
                if (!$disc['closedAt']) {
                    $running[] = [
                        'session_discussion_id' => $disc['id'],
                        'title' => $disc['title'] ?? 'Diskusi',
                        'group_id' => $disc['groupId'] ?? null,
                        'week_id' => $disc['weekId'] ?? null,
                        'status' => 'running',
                    ];
                }
            }
        }

        $weekLabels = [];
        if (!empty($byWeek)) {
            $weeks = CourseWeek::where('course_id', $course)
                ->whereIn('id', array_keys($byWeek))
                ->get(['id', 'week_index', 'title']);

            foreach ($weeks as $week) {
                $indexLabel = $week->week_index ? "Minggu {$week->week_index}" : 'Minggu';
                $title = trim((string) ($week->title ?? ''));
                $weekLabels[$week->id] = $title !== '' ? "{$indexLabel}: {$title}" : $indexLabel;
            }
        }

        return response()->json([
            'byWeek' => $byWeek,
            'weekLabels' => $weekLabels,
            'other' => $other,
            'running' => $running,
            'groupMembers' => $groupMembers,
        ]);
    }

    /**
     * Get a specific session with all attendance records.
     * Returns student info + message count + HOT count from notes field.
     */
    public function showSession(string $course, string $sessionId): JsonResponse
    {
        // Verify lecturer owns the course
        $courseModel = Course::where('id', $course)->first();
        if (!$courseModel || $courseModel->lecturer_id !== session('user.id')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $session = AttendanceSession::where('id', $sessionId)
            ->where('course_id', $course)
            ->first();

        if (!$session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        $records = AttendanceRecord::where('session_id', $sessionId)
            ->get()
            ->map(function ($record) {
                // Parse message_count and hot_count from notes if stored as "N pesan, M HOT"
                $messageCount = null;
                $hotCount = null;
                if ($record->notes) {
                    if (preg_match('/(\d+)\s*pesan,\s*(\d+)\s*HOT/', $record->notes, $matches)) {
                        $messageCount = (int) $matches[1];
                        $hotCount = (int) $matches[2];
                    }
                }

                return [
                    'student_id' => $record->student_id,
                    'student_name' => $record->student_name ?? 'Unknown',
                    'student_email' => $record->student_email ?? '',
                    'status' => $record->status,
                    'message_count' => $messageCount,
                    'hot_count' => $hotCount,
                    'notes' => $record->notes,
                    'marked_at' => $record->marked_at,
                    'marked_by' => $record->marked_by,
                ];
            });

        return response()->json([
            'session' => $session,
            'records' => $records,
        ]);
    }

    /**
     * Override attendance status for students in a session.
     * Accepts overrides array [{ studentId, status, notes }].
     */
    public function override(Request $request, string $course, string $sessionId): JsonResponse
    {
        // Verify lecturer owns the course
        $courseModel = Course::where('id', $course)->first();
        if (!$courseModel || $courseModel->lecturer_id !== session('user.id')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'overrides' => 'required|array',
            'overrides.*.studentId' => 'required|string',
            'overrides.*.status' => 'required|in:present,absent,excused',
            'overrides.*.notes' => 'nullable|string',
        ]);

        $session = AttendanceSession::where('id', $sessionId)
            ->where('course_id', $course)
            ->first();

        if (!$session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        DB::beginTransaction();
        try {
            foreach ($validated['overrides'] as $override) {
                $record = AttendanceRecord::where('session_id', $sessionId)
                    ->where('student_id', $override['studentId'])
                    ->first();

                if ($record) {
                    // Preserve original auto-status in notes if not already there
                    $originalStatus = $record->status;
                    $notes = $override['notes'] ?? $record->notes;
                    if ($record->marked_by === null && $originalStatus !== $override['status']) {
                        // First override - preserve original
                        $notes = "Original: {$originalStatus}. " . ($notes ?? '');
                    }

                    $record->update([
                        'status' => $override['status'],
                        'marked_by' => session('user.id'),
                        'marked_at' => now(),
                        'notes' => $notes,
                    ]);
                }
            }

            // Recalculate session stats
            $this->recalculateSessionStats($sessionId);

            DB::commit();

            // Return updated records
            $records = AttendanceRecord::where('session_id', $sessionId)->get();
            return response()->json(['records' => $records]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update attendance', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get attendance summary per student for the course.
     * Filter by week + group. Excused ≠ absent. Pending excluded from denominator.
     */
    public function summary(string $course): JsonResponse
    {
        // Verify lecturer owns the course
        $courseModel = Course::where('id', $course)->first();
        if (!$courseModel || $courseModel->lecturer_id !== session('user.id')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $weekId = request()->query('week_id');
        $groupId = request()->query('group_id');

        $query = AttendanceSession::where('course_id', $course);

        if ($weekId) {
            $query->where('week_id', $weekId);
        }

        if ($groupId) {
            $query->where('group_id', $groupId);
        }

        $sessionIds = $query->pluck('id');

        $records = AttendanceRecord::whereIn('session_id', $sessionIds)->get();

        // Group by student
        $studentSummary = [];
        foreach ($records as $record) {
            $studentId = $record->student_id;
            if (!isset($studentSummary[$studentId])) {
                $studentSummary[$studentId] = [
                    'student_id' => $studentId,
                    'student_name' => $record->student_name ?? 'Unknown',
                    'student_email' => $record->student_email ?? '',
                    'total_sessions' => 0,
                    'present' => 0,
                    'absent' => 0,
                    'excused' => 0,
                ];
            }

            $studentSummary[$studentId]['total_sessions']++;
            if ($record->status === 'present') {
                $studentSummary[$studentId]['present']++;
            } elseif ($record->status === 'absent') {
                $studentSummary[$studentId]['absent']++;
            } elseif ($record->status === 'excused') {
                $studentSummary[$studentId]['excused']++;
            }
        }

        // Calculate attendance percentage (excused excluded from denominator)
        foreach ($studentSummary as &$summary) {
            $denominator = $summary['present'] + $summary['absent'];
            $summary['attendance_percentage'] = $denominator > 0
                ? round(($summary['present'] / $denominator) * 100, 2)
                : 0;
        }

        return response()->json(['summary' => array_values($studentSummary)]);
    }

    /**
     * Bulk close sessions. Core-api saves attendance to PostgreSQL automatically.
     */
    public function bulkClose(Request $request, string $course): JsonResponse
    {
        $courseModel = Course::where('id', $course)->first();
        if (!$courseModel || $courseModel->lecturer_id !== session('user.id')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'sessionDiscussionIds' => 'required|array',
            'sessionDiscussionIds.*' => 'required|string',
        ]);

        $response = $this->apiRequest(60)->post($this->apiUrl() . '/api/session-discussions/bulk-close', [
            'sessionDiscussionIds' => $validated['sessionDiscussionIds'],
        ]);

        if (!$response->successful()) {
            return response()->json(['message' => 'Failed to close sessions', 'error' => $response->json()], $response->status());
        }

        return response()->json(['message' => 'Sessions closed and attendance recorded', 'data' => $response->json('data', [])]);
    }

    /**
     * Close a single session discussion.
     * Core-api saves attendance to PostgreSQL automatically on close.
     */
    public function closeSingle(Request $request, string $course): JsonResponse
    {
        $courseModel = Course::where('id', $course)->first();
        if (!$courseModel || $courseModel->lecturer_id !== session('user.id')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'sessionDiscussionId' => 'required|string',
        ]);

        $response = $this->apiRequest(30)->post(
            $this->apiUrl() . '/api/session-discussions/' . $validated['sessionDiscussionId'] . '/close'
        );

        if (!$response->successful()) {
            return response()->json(['message' => 'Failed to close session', 'error' => $response->json()], $response->status());
        }

        $sessionData = $response->json('data', []);

        return response()->json([
            'message' => 'Sesi ditutup, kehadiran dicatat',
            'data' => $sessionData,
        ]);
    }

    /**
     * Delete attendance session.
     */
    public function destroySession(string $course, string $sessionId): JsonResponse
    {
        // Verify lecturer owns the course
        $courseModel = Course::where('id', $course)->first();
        if (!$courseModel || $courseModel->lecturer_id !== session('user.id')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $session = AttendanceSession::where('id', $sessionId)->where('course_id', $course)->first();
        if (!$session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        DB::beginTransaction();
        try {
            AttendanceRecord::where('session_id', $sessionId)->delete();
            $session->delete();
            DB::commit();

            return response()->json(['message' => 'Session deleted']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete session', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Export attendance to CSV.
     * Updated columns: remove "Late", add "HOT Count", "Pesan Count".
     */
    public function export(string $course): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        // Verify lecturer owns the course
        $courseModel = Course::where('id', $course)->first();
        if (!$courseModel || $courseModel->lecturer_id !== session('user.id')) {
            abort(403, 'Forbidden');
        }

        $sessions = AttendanceSession::where('course_id', $course)
            ->orderBy('session_date')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="attendance_' . $course . '_' . date('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($sessions) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Session', 'Date', 'Student ID', 'Student Name', 'Status', 'Pesan Count', 'HOT Count', 'Marked At']);

            foreach ($sessions as $session) {
                $records = AttendanceRecord::where('session_id', $session->id)->get();
                foreach ($records as $record) {
                    // Parse message_count and hot_count from notes
                    $messageCount = '';
                    $hotCount = '';
                    if ($record->notes && preg_match('/(\d+)\s*pesan,\s*(\d+)\s*HOT/', $record->notes, $matches)) {
                        $messageCount = $matches[1];
                        $hotCount = $matches[2];
                    }

                    fputcsv($file, [
                        $session->title,
                        $session->session_date,
                        $record->student_id,
                        $record->student_name ?? '',
                        $record->status,
                        $messageCount,
                        $hotCount,
                        $record->marked_at ?? '',
                    ]);
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Helper: Create attendance session and records from core-api attendanceData.
     */
    private function createAttendanceFromData(string $courseId, array $attendanceData): void
    {
        $sessionId = Str::uuid()->toString();

        // Create attendance session
        AttendanceSession::create([
            'id' => $sessionId,
            'course_id' => $courseId,
            'session_discussion_id' => $attendanceData['sessionDiscussionId'] ?? null,
            'week_id' => $attendanceData['weekId'] ?? null,
            'group_id' => $attendanceData['groupId'] ?? null,
            'title' => 'Auto Attendance - ' . ($attendanceData['weekId'] ?? 'Session'),
            'session_date' => now(),
            'session_number' => null,
            'auto_generated' => true,
            'attendance_method' => 'auto',
            'notes' => 'Auto-generated from discussion participation',
            'created_by' => session('user.id'),
            'total_students' => count($attendanceData['students'] ?? []),
            'present_count' => 0,
            'absent_count' => 0,
            'excused_count' => 0,
            'marked_count' => 0,
            'attendance_rate' => 0,
        ]);

        // Create attendance records
        $presentCount = 0;
        $absentCount = 0;

        foreach ($attendanceData['students'] ?? [] as $student) {
            $status = $student['status'] ?? 'absent';
            $messageCount = $student['messageCount'] ?? 0;
            $hotCount = $student['hotCount'] ?? 0;

            AttendanceRecord::create([
                'id' => Str::uuid()->toString(),
                'session_id' => $sessionId,
                'student_id' => $student['studentId'],
                'student_name' => $student['studentName'] ?? '',
                'student_email' => '',
                'status' => $status,
                'notes' => "{$messageCount} pesan, {$hotCount} HOT",
                'marked_at' => now(),
                'marked_by' => null,
            ]);

            if ($status === 'present') {
                $presentCount++;
            } elseif ($status === 'absent') {
                $absentCount++;
            }
        }

        // Update session stats
        $totalStudents = count($attendanceData['students'] ?? []);
        AttendanceSession::where('id', $sessionId)->update([
            'present_count' => $presentCount,
            'absent_count' => $absentCount,
            'marked_count' => $totalStudents,
            'attendance_rate' => $totalStudents > 0 ? round(($presentCount / $totalStudents) * 100, 2) : 0,
        ]);
    }

    /**
     * Helper: Recalculate session stats after override.
     */
    private function recalculateSessionStats(string $sessionId): void
    {
        $records = AttendanceRecord::where('session_id', $sessionId)->get();
        $presentCount = $records->where('status', 'present')->count();
        $absentCount = $records->where('status', 'absent')->count();
        $excusedCount = $records->where('status', 'excused')->count();
        $totalStudents = $records->count();

        AttendanceSession::where('id', $sessionId)->update([
            'present_count' => $presentCount,
            'absent_count' => $absentCount,
            'excused_count' => $excusedCount,
            'marked_count' => $totalStudents,
            'attendance_rate' => $totalStudents > 0 ? round(($presentCount / $totalStudents) * 100, 2) : 0,
        ]);
    }
}
