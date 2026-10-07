<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function courseIndex(Request $request, string $course): Response
    {
        try {
            $courseResponse = $this->apiRequest()->get($this->apiUrl() . "/api/courses/{$course}");
            $courseData = $courseResponse->successful() ? $courseResponse->json('data') : null;

            if (!$courseData) {
                abort(404, 'Course not found');
            }

            $params = array_filter([
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ]);

            $analyticsResponse = $this->apiRequest()->get(
                $this->apiUrl() . "/api/analytics/course/{$course}",
                $params
            );
            $analyticsData = $analyticsResponse->successful() ? $analyticsResponse->json() : null;

            $analytics = null;
            if ($analyticsData && ($analyticsData['success'] ?? false)) {
                $analytics = [
                    'summary' => $analyticsData['summary'] ?? null,
                    'groups' => $analyticsData['groups'] ?? [],
                    'trends' => $analyticsData['trends'] ?? null,
                ];
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch course analytics', ['error' => $e->getMessage()]);
            $courseData = null;
            $analytics = null;
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch course analytics', ['error' => $e->getMessage()]);
            $courseData = null;
            $analytics = null;
        }

        if (!$courseData) {
            abort(404, 'Course not found');
        }

        return Inertia::render('lecturer/analytics/index', [
            'course' => $courseData,
            'analytics' => $analytics ?? [
                'summary' => [
                    'totalGroups' => 0,
                    'averageQualityScore' => null,
                    'totalMessages' => 0,
                    'groupsNeedingAttention' => 0,
                ],
                'groups' => [],
                'trends' => null,
            ],
            'filters' => [
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ],
            'socketUrl' => config('services.api.socket_url', 'http://localhost:3000'),
        ]);
    }

    public function groupShow(string $course, string $group): Response
    {
        try {
            $courseResponse = $this->apiRequest()->get($this->apiUrl() . "/api/courses/{$course}");
            $courseData = $courseResponse->successful() ? $courseResponse->json('data') : null;

            $groupResponse = $this->apiRequest()->get($this->apiUrl() . "/api/groups/{$group}");
            $groupData = $groupResponse->successful() ? $groupResponse->json('data') : null;

            $analyticsResponse = $this->apiRequest()->get($this->apiUrl() . "/api/analytics/group/{$group}");
            $analyticsData = $analyticsResponse->successful() ? $analyticsResponse->json() : null;

            $analytics = null;
            $recentActivity = [];
            $members = [];
            $sessionDiscussions = [];

            if ($analyticsData && ($analyticsData['success'] ?? false)) {
                $analytics = $analyticsData['analytics'] ?? null;
                $recentActivity = $analyticsData['recentActivity'] ?? [];
                $members = $analyticsData['members'] ?? [];
                $sessionDiscussions = $analyticsData['sessionDiscussions'] ?? [];
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch alerts', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch alerts',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch alerts', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch alerts',
            ], 500);
        }

        if (!$courseData || !$groupData) {
            abort(404, 'Course or group not found');
        }

        return Inertia::render('lecturer/analytics/show', [
            'course' => $courseData,
            'group' => $groupData,
            'analytics' => $analytics ?? [
                'qualityScore' => null,
                'hotPercentage' => 0,
                'local_message_count' => 0,
                'engagementDistribution' => [
                    'cognitive' => 0,
                    'behavioral' => 0,
                    'emotional' => 0,
                ],
                'qualityBreakdown' => [
                    'lexical_variety' => 0,
                    'hot_percentage' => 0,
                    'participation' => 0,
                ],
                'recommendation' => null,
            ],
            'members' => $members,
            'sessionDiscussions' => $sessionDiscussions,
            'recentActivity' => $recentActivity,
            'socketUrl' => config('services.api.socket_url', 'http://localhost:3000'),
        ]);
    }

    public function export(Request $request, string $course)
    {
        $format = $request->get('format', 'csv');

        try {
            $params = array_filter([
                'courseId' => $course,
                'format' => $format,
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ]);

            $response = $this->apiRequest(timeout: 30)->get(
                $this->apiUrl() . "/api/analytics/export",
                $params
            );

            if (!$response->successful()) {
                // P2-09 (pass2): 403/404 harus diteruskan sbg JSON dgn status
                // aslinya — dulu jadi 302 back() tanpa pesan yang menyesatkan
                // konsumen fetch/download.
                $status = $response->status();
                if (in_array($status, [401, 403, 404], true)) {
                    return response()->json([
                        'message' => $response->json('message')
                            ?? $response->json('error.message')
                            ?? 'Failed to export analytics data',
                        'code' => $response->json('error.code') ?? 'EXPORT_FAILED',
                    ], $status);
                }
                return back()->withErrors(['export' => 'Failed to export analytics data']);
            }

            $data = $response->json('data');

            if ($format === 'csv') {
                $csvContent = $data['content'] ?? $this->arrayToCsv($data['rows'] ?? []);
                return response($csvContent, 200, [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => "attachment; filename=\"analytics_{$course}_{$this->dateStamp()}.csv\"",
                ]);
            }

            if ($format === 'pdf') {
                return response()->json([
                    'success' => true,
                    'message' => 'PDF export initiated',
                    'downloadUrl' => $data['downloadUrl'] ?? null,
                ]);
            }

            return response()->json($data);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to export analytics', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to export analytics',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to export analytics', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to export analytics',
            ], 500);
        }
    }

    public function overview(Request $request): Response
    {
        $courses = [];

        try {
            $params = array_filter([
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ]);

            $response = $this->apiRequest()->get($this->apiUrl() . '/api/analytics/overview', $params);
            if ($response->successful()) {
                $courses = $response->json('courses', []);
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch group messages', ['error' => $e->getMessage()]);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch group messages', ['error' => $e->getMessage()]);
        }

        return Inertia::render('lecturer/analytics/overview', [
            'courses' => $courses,
            'filters' => [
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ],
        ]);
    }

    public function comparison(Request $request): Response
    {
        $request->validate([
            'course_ids' => 'required|array|min:2|max:3',
            'course_ids.*' => 'string',
        ]);

        $comparisonData = [];

        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/analytics/comparison', [
                'courseIds' => $request->get('course_ids'),
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ]);

            if ($response->successful()) {
                $comparisonData = $response->json('data', []);
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch group analytics', ['error' => $e->getMessage()]);
            $courseData = null;
            $groupData = null;
            $analytics = null;
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch group analytics', ['error' => $e->getMessage()]);
            $courseData = null;
            $groupData = null;
            $analytics = null;
        }

        return Inertia::render('lecturer/analytics/comparison', [
            'comparisonData' => $comparisonData,
            'selectedCourses' => $request->get('course_ids', []),
            'filters' => [
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ],
        ]);
    }

    public function liveStats(string $course)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/analytics/courses/{$course}/live");

            if ($response->successful()) {
                return response()->json($response->json('data'));
            }

            // P2-08 (pass2): non-2xx dulu dipetakan semua ke 500 — 403 utk
            // kursus non-pemilik seharusnya tetap 403.
            $status = $response->status();
            return response()->json([
                'error' => $response->json('message')
                    ?? $response->json('error.message')
                    ?? 'Failed to fetch live stats',
            ], in_array($status, [401, 403, 404, 429], true) ? $status : 500);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch group quality metrics', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch quality metrics',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch group quality metrics', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch quality metrics',
            ], 500);
        }
    }

    public function trends(Request $request, string $course)
    {
        try {
            $params = array_filter([
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
                'metric' => $request->get('metric', 'engagement'),
                'zoomStart' => $request->get('zoom_start'),
                'zoomEnd' => $request->get('zoom_end'),
            ]);

            $response = $this->apiRequest()->get(
                $this->apiUrl() . "/api/analytics/courses/{$course}/trends",
                $params
            );

            if ($response->successful()) {
                return response()->json($response->json('data'));
            }

            return response()->json(['error' => 'Failed to fetch trends'], 500);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch group participation', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch participation data',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch group participation', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch participation data',
            ], 500);
        }
    }

    public function detail(string $course): Response
    {
        try {
            $courseResponse = $this->apiRequest()->get($this->apiUrl() . "/api/courses/{$course}");
            $courseData = $courseResponse->successful() ? $courseResponse->json('data') : null;

            if (!$courseData) {
                abort(404, 'Course not found');
            }

            $analyticsResponse = $this->apiRequest()->get($this->apiUrl() . "/api/analytics/course/{$course}");
            $analyticsData = $analyticsResponse->successful() ? $analyticsResponse->json() : null;

            $analytics = null;
            if ($analyticsData && ($analyticsData['success'] ?? false)) {
                $analytics = [
                    'summary' => $analyticsData['summary'] ?? null,
                    'groups' => $analyticsData['groups'] ?? [],
                    'trends' => $analyticsData['trends'] ?? null,
                ];
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch group trends', ['error' => $e->getMessage()]);
            return Inertia::render('lecturer/analytics/detail', [
                'course' => null,
                'analytics' => ['summary' => ['totalGroups' => 0, 'averageQualityScore' => null, 'totalMessages' => 0, 'groupsNeedingAttention' => 0], 'groups' => [], 'trends' => null],
                'socketUrl' => config('services.api.socket_url', 'http://localhost:3000'),
            ]);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch group trends', ['error' => $e->getMessage()]);
            return Inertia::render('lecturer/analytics/detail', [
                'course' => null,
                'analytics' => ['summary' => ['totalGroups' => 0, 'averageQualityScore' => null, 'totalMessages' => 0, 'groupsNeedingAttention' => 0], 'groups' => [], 'trends' => null],
                'socketUrl' => config('services.api.socket_url', 'http://localhost:3000'),
            ]);
        }

        if (!$courseData) {
            abort(404, 'Course not found');
        }

        return Inertia::render('lecturer/analytics/detail', [
            'course' => $courseData,
            'analytics' => $analytics ?? [
                'summary' => [
                    'totalGroups' => 0,
                    'averageQualityScore' => null,
                    'totalMessages' => 0,
                    'groupsNeedingAttention' => 0,
                ],
                'groups' => [],
                'trends' => null,
            ],
            'socketUrl' => config('services.api.socket_url', 'http://localhost:3000'),
        ]);
    }

    public function studentBreakdown(Request $request, string $course)
    {
        try {
            $params = array_filter([
                'page' => $request->get('page', 1),
                'perPage' => $request->get('per_page', 15),
                'sortBy' => $request->get('sort_by', 'quality_score'),
                'sortDir' => $request->get('sort_dir', 'desc'),
                'search' => $request->get('search'),
                'minScore' => $request->get('min_score'),
                'maxScore' => $request->get('max_score'),
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ]);

            $response = $this->apiRequest()->get(
                $this->apiUrl() . "/api/analytics/courses/{$course}/students",
                $params
            );

            if ($response->successful()) {
                return $this->proxyResponse($response);
            }

            return response()->json(['data' => [], 'meta' => ['total' => 0, 'per_page' => 15, 'current_page' => 1, 'last_page' => 1]]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch course comparison', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch comparison data',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch course comparison', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch comparison data',
            ], 500);
        }
    }

    public function studentDetail(Request $request, string $course, string $student)
    {
        try {
            $params = array_filter([
                'page' => 1,
                'perPage' => 500,
                'sortBy' => $request->get('sort_by', 'quality_score'),
                'sortDir' => $request->get('sort_dir', 'desc'),
                'search' => $request->get('search'),
                'minScore' => $request->get('min_score'),
                'maxScore' => $request->get('max_score'),
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ]);

            $response = $this->apiRequest()->get(
                $this->apiUrl() . "/api/analytics/courses/{$course}/students",
                $params
            );

            if ($response->successful()) {
                $students = $response->json('data', []);
                $studentData = collect($students)->firstWhere('id', $student);

                if ($studentData) {
                    return response()->json([
                        'data' => [
                            'student' => [
                                'id' => $studentData['id'],
                                'name' => $studentData['name'],
                                'email' => $studentData['email'],
                            ],
                            'qualityScore' => $studentData['qualityScore'],
                            'hotPercentage' => $studentData['hotPercentage'] ?? 0,
                            'messageCount' => $studentData['messageCount'] ?? 0,
                            'engagementDistribution' => [],
                            'trends' => [],
                            'recommendations' => [],
                        ],
                    ]);
                }
            }

            return response()->json(['data' => null, 'error' => 'Student not found'], 404);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch message details', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch message details',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch message details', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch message details',
            ], 500);
        }
    }

    public function exportSection(Request $request, string $course)
    {
        try {
            $format = $request->get('format', 'csv');
            $section = $request->get('section', 'overview');

            $params = array_filter([
                'courseId' => $course,
                'format' => $format,
                'section' => $section,
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
                'studentId' => $request->get('student_id'),
                'metric' => $request->get('metric'),
            ]);

            $response = $this->apiRequest(timeout: 30)->get(
                $this->apiUrl() . "/api/analytics/export",
                $params
            );

            if (!$response->successful()) {
                return back()->withErrors(['export' => 'Failed to export analytics data']);
            }

            $data = $response->json('data');

            if ($format === 'csv') {
                $csvContent = $data['content'] ?? $this->arrayToCsv($data['rows'] ?? []);
                return response($csvContent, 200, [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => "attachment; filename=\"analytics_{$section}_{$course}_{$this->dateStamp()}.csv\"",
                ]);
            }

            if ($format === 'pdf') {
                return response()->json([
                    'success' => true,
                    'message' => 'PDF export initiated',
                    'downloadUrl' => $data['downloadUrl'] ?? null,
                ]);
            }

            return response()->json($data);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch group comparison', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch comparison data',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch group comparison', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch comparison data',
            ], 500);
        }
    }

    public function generateShareLink(Request $request, string $course)
    {
        $request->validate([
            'section' => 'required|string',
            'expires_in_days' => 'nullable|integer|min:1|max:30',
        ]);

        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . "/api/analytics/courses/{$course}/share",
                array_filter([
                    'section' => $request->get('section'),
                    'expiresInDays' => $request->get('expires_in_days', 7),
                    'studentId' => $request->get('student_id'),
                    'metric' => $request->get('metric'),
                    'startDate' => $request->get('start_date'),
                    'endDate' => $request->get('end_date'),
                ])
            );

            if ($response->successful()) {
                return $this->proxyResponse($response);
            }

            return response()->json(['error' => 'Failed to generate share link'], 500);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch group timeline', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch timeline data',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch group timeline', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch timeline data',
            ], 500);
        }
    }

    public function accessShared(string $token)
    {
        try {
            $response = $this->coreApiRequest()->get(
                $this->apiUrl() . "/api/analytics/shared/{$token}"
            );

            if ($response->successful()) {
                $data = $response->json('data');
                return Inertia::render('lecturer/analytics/shared', [
                    'report' => $data,
                    'token' => $token,
                ]);
            }

            if ($response->status() === 404) {
                abort(404, 'Shared report not found or expired');
            }

            abort(500, 'Failed to load shared report');
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch course trends', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch trends data',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch course trends', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch trends data',
            ], 500);
        }
    }

    public function benchmark(Request $request, string $course)
    {
        try {
            $params = array_filter([
                'metric' => $request->get('metric', 'quality_score'),
                'startDate' => $request->get('start_date'),
                'endDate' => $request->get('end_date'),
                'preset' => $request->get('preset'),
            ]);

            $response = $this->apiRequest()->get(
                $this->apiUrl() . "/api/analytics/courses/{$course}/benchmark",
                $params
            );

            if ($response->successful()) {
                return $this->proxyResponse($response);
            }

            return response()->json([
                'data' => [
                    'departmentAverage' => null,
                    'sampleSize' => 0,
                    'percentileRank' => null,
                    'metric' => $request->get('metric', 'quality_score'),
                ],
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to fetch student analytics', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student analytics',
            ], 500);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Failed to fetch student analytics', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student analytics',
            ], 500);
        }
    }

    private function arrayToCsv(array $rows): string
    {
        if (empty($rows)) {
            return '';
        }

        $output = fopen('php://temp', 'r+');
        fputcsv($output, array_keys($rows[0]));
        foreach ($rows as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        return $csv;
    }

    private function dateStamp(): string
    {
        return now()->format('Y-m-d_His');
    }
}
