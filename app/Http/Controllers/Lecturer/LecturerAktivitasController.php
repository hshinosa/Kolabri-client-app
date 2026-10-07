<?php

namespace App\Http\Controllers\Lecturer;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LecturerAktivitasController extends Controller
{
    /**
     * Get diskusi activity per student for a course.
     * Proxies to Core API and aggregates data.
     */
    public function index(string $course): JsonResponse
    {
        try {
            // Fetch enrolled students
            $studentsResponse = $this->apiRequest()->get(
                $this->apiUrl() . "/api/courses/{$course}/students"
            );

            // P2-09 (pass2): 403/404 core-api (kursus bukan milik dosen ini)
            // dulu ditelan → 200 {data:[]} seolah-olah kursus kosong.
            $deny = fn ($r) => in_array($r->status(), [401, 403, 404], true)
                ? response()->json([
                    'message' => $r->json('message') ?? $r->json('error.message') ?? 'Forbidden',
                    'code' => $r->json('error.code') ?? 'FORBIDDEN',
                ], $r->status())
                : null;

            if ($denied = $deny($studentsResponse)) {
                return $denied;
            }
            $students = $studentsResponse->successful() ? $studentsResponse->json('data', []) : [];

            // Fetch messages/activity for the course
            $messagesResponse = $this->apiRequest()->get(
                $this->apiUrl() . "/api/courses/{$course}/messages",
                ['limit' => 10000]
            );
            if ($denied = $deny($messagesResponse)) {
                return $denied;
            }
            $messages = $messagesResponse->successful() ? $messagesResponse->json('data', []) : [];

            // Aggregate activity per student
            $activityMap = [];

            foreach ($messages as $message) {
                $senderId = $message['sender_id'] ?? null;
                if (!$senderId || ($message['sender_type'] ?? 'user') !== 'user') {
                    continue;
                }

                if (!isset($activityMap[$senderId])) {
                    $activityMap[$senderId] = [
                        'total_messages' => 0,
                        'active_days' => [],
                        'sessions' => 0,
                        'last_activity' => null,
                    ];
                }

                $activityMap[$senderId]['total_messages']++;

                $createdAt = $message['created_at'] ?? null;
                if ($createdAt) {
                    $day = date('Y-m-d', strtotime($createdAt));
                    $activityMap[$senderId]['active_days'][$day] = true;

                    if (!$activityMap[$senderId]['last_activity'] || $createdAt > $activityMap[$senderId]['last_activity']) {
                        $activityMap[$senderId]['last_activity'] = $createdAt;
                    }
                }

                // Track sessions (group_id changes = new session)
                $groupId = $message['group_id'] ?? $message['session_discussion_id'] ?? null;
                if ($groupId) {
                    $key = $groupId . '_' . date('Y-m-d', strtotime($createdAt));
                    $activityMap[$senderId]['sessions_key'][$key] = true;
                }
            }

            // Build response per student
            $studentActivity = [];
            foreach ($students as $student) {
                $sid = $student['id'] ?? $student['user_id'] ?? null;
                if (!$sid) continue;

                $activity = $activityMap[$sid] ?? [
                    'total_messages' => 0,
                    'active_days' => [],
                    'sessions' => 0,
                    'last_activity' => null,
                ];

                $activeDayCount = count($activity['active_days'] ?? []);
                $sessionCount = count($activity['sessions_key'] ?? []);

                // Calculate frequency: active days per week
                $weeksActive = max(1, $activeDayCount / 7);
                $frequency = round($activeDayCount / $weeksActive, 1);

                $studentActivity[] = [
                    'student' => [
                        'id' => $sid,
                        'name' => $student['name'] ?? $student['user']['name'] ?? 'Unknown',
                        'email' => $student['email'] ?? $student['user']['email'] ?? '',
                    ],
                    'total_messages' => $activity['total_messages'],
                    'active_days' => $activeDayCount,
                    'frequency' => $frequency,
                    'avg_messages_per_session' => $sessionCount > 0
                        ? round($activity['total_messages'] / $sessionCount, 1)
                        : $activity['total_messages'],
                    'last_activity' => $activity['last_activity'],
                ];
            }

            // Sort by total messages desc
            usort($studentActivity, fn($a, $b) => $b['total_messages'] - $a['total_messages']);

            return response()->json([
                'data' => $studentActivity,
                'summary' => [
                    'total_students' => count($studentActivity),
                    'total_messages' => array_sum(array_column($studentActivity, 'total_messages')),
                    'active_students' => count(array_filter($studentActivity, fn($a) => $a['total_messages'] > 0)),
                ],
            ]);
        } catch (ConnectionException $e) {
            Log::error('LecturerAktivitasController: failed to fetch activity', [
                'course' => $course,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'data' => [],
                'summary' => ['total_students' => 0, 'total_messages' => 0, 'active_students' => 0],
            ]);
        } catch (RequestException $e) {
            Log::error('LecturerAktivitasController: failed to fetch activity', [
                'course' => $course,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'data' => [],
                'summary' => ['total_students' => 0, 'total_messages' => 0, 'active_students' => 0],
            ]);
        }
    }

    /**
     * Export diskusi activity to CSV.
     */
    public function export(string $course): \Symfony\Component\HttpFoundation\Response
    {
        try {
            $response = $this->index($course);
            // P2-09: kalau index menolak (403/404), export ikut menolak —
            // dulu tetap download CSV hanya berisi header.
            if ($response->getStatusCode() >= 400) {
                return $response;
            }
            $data = json_decode($response->getContent(), true)['data'] ?? [];
        } catch (ConnectionException $e) {
            $data = [];
        } catch (RequestException $e) {
            $data = [];
        }

        $filename = "aktivitas_diskusi_{$course}_" . date('Y-m-d') . ".csv";

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function () use ($data) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Nama', 'Email', 'Total Pesan', 'Hari Aktif', 'Frekuensi (hari/minggu)', 'Rata-rata/Sesi', 'Aktivitas Terakhir']);

            foreach ($data as $row) {
                fputcsv($handle, [
                    $row['student']['name'],
                    $row['student']['email'],
                    $row['total_messages'],
                    $row['active_days'],
                    $row['frequency'],
                    $row['avg_messages_per_session'],
                    $row['last_activity'] ? date('d/m/Y H:i', strtotime($row['last_activity'])) : '-',
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}
