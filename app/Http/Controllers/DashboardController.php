<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Illuminate\Http\RedirectResponse;

class DashboardController extends Controller
{

    /**
     * Main Dashboard - Redirects based on user role
     */
    public function index(): InertiaResponse|RedirectResponse
    {
        $user = session('user');

        if (!$user) {
            return redirect()->route('auth.login.index');
        }

        // Render role-specific dashboard
        if ($user['role'] === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        if ($user['role'] === 'lecturer') {
            return $this->lecturerDashboard();
        }

        return $this->studentDashboard();
    }

    /**
     * Lecturer Dashboard - Fetch real data from Core-API
     */
    private function lecturerDashboard(): InertiaResponse
    {
        $courses = [];
        $totalStudents = 0;
        $totalGroups = 0;
        $coursesNeedingAttention = 0;

        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/courses');
            if ($response->successful()) {
                $courses = $response->json('data', []);
                
                // Calculate totals from courses data
                foreach ($courses as $course) {
                    $totalStudents += $course['students_count'] ?? 0;
                    $totalGroups += $course['groups_count'] ?? 0;
                }
            }
        } catch (ConnectionException $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard: failed to fetch courses', ['error' => $e->getMessage()]);
        } catch (RequestException $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard: failed to fetch courses', ['error' => $e->getMessage()]);
        }

        // Get recent activity from chatlogs (last 5 messages across all groups)
        $recentActivity = [];
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/analytics/activity/recent', ['limit' => 5]);
            if ($response->successful()) {
                $recentActivity = $response->json('data', []);
            }
        } catch (ConnectionException $e) {
            // Activity endpoint may not exist yet, continue without it
        } catch (RequestException $e) {
            // Activity endpoint may not exist yet, continue without it
        }

        $chartData = ['classDistribution' => [], 'qualityTrends' => []];
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/analytics/dashboard-charts');
            if ($response->successful()) {
                $chartData = $response->json('data', $chartData);
            }
        } catch (ConnectionException $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard: failed to fetch chart data', ['error' => $e->getMessage()]);
        } catch (RequestException $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard: failed to fetch chart data', ['error' => $e->getMessage()]);
        }

        return Inertia::render('lecturer/dashboard', [
            'stats' => [
                'totalCourses' => count($courses),
                'totalStudents' => $totalStudents,
                'totalGroups' => $totalGroups,
                'coursesNeedingAttention' => $coursesNeedingAttention,
            ],
            'recentCourses' => array_slice($courses, 0, 4),
            'recentActivity' => $recentActivity,
            'chartData' => $chartData,
        ]);
    }

    /**
     * Student Dashboard - Fetch aggregated stats from Core-API
     */
    private function studentDashboard(): InertiaResponse
    {
        $courses = [];
        $stats = [
            'enrolledCourses' => 0,
            'activeGroups' => 0,
            'reflections' => 0,
            'chatMessages' => 0,
        ];
        $recentActivity = [];

        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/courses/enrolled');
            if ($response->successful()) {
                $courses = $response->json('data', []);
                $stats['enrolledCourses'] = count($courses);
            }
        } catch (ConnectionException $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard: failed to fetch student courses', ['error' => $e->getMessage()]);
        } catch (RequestException $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard: failed to fetch student courses', ['error' => $e->getMessage()]);
        }

        // Fetch student stats from core-api
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/analytics/student/stats');
            if ($response->successful()) {
                $data = $response->json('data', []);
                $stats['activeGroups'] = $data['activeGroups'] ?? 0;
                $stats['reflections'] = $data['reflections'] ?? 0;
                $stats['chatMessages'] = $data['chatMessages'] ?? 0;
            }
        } catch (ConnectionException $e) {
            \Illuminate\Support\Facades\Log::warning('Student stats API error', ['error' => $e->getMessage()]);
        } catch (RequestException $e) {
            \Illuminate\Support\Facades\Log::warning('Student stats API error', ['error' => $e->getMessage()]);
        }

        // Fetch recent activity
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/student/activity/recent', ['limit' => 5]);
            if ($response->successful()) {
                $recentActivity = $response->json('data', []);
            }
        } catch (ConnectionException $e) {
            // Activity endpoint may not exist yet, continue without it
        } catch (RequestException $e) {
            // Activity endpoint may not exist yet, continue without it
        }

        // SRL Zimmerman pribadi (classifier AI engine)
        $srl = null;
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/student/srl');
            if ($response->successful()) {
                $srl = $response->json('data');
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Student SRL fetch failed', ['error' => $e->getMessage()]);
        }

        return Inertia::render('student/dashboard', [
            'enrolledCourses' => $courses,
            'stats' => $stats,
            'recentActivity' => $recentActivity,
            'srl' => $srl,
        ]);
    }

    /**
     * Admin Dashboard
     */
    public function admin(): InertiaResponse|JsonResponse
    {
        $rangeQuery = array_filter([
            'startDate' => request()->query('startDate'),
            'endDate' => request()->query('endDate'),
        ]);

        $stats = null;
        $activities = [];
        $usageStats = null;

        try {
            $statsResponse = $this->apiRequest()->get($this->apiUrl() . '/api/admin/dashboard/stats', $rangeQuery);
            if ($statsResponse->successful()) {
                $stats = $statsResponse->json('data');
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard stats fetch failed', ['error' => $e->getMessage()]);
        }

        try {
            $activityResponse = $this->apiRequest()->get($this->apiUrl() . '/api/admin/dashboard/activity', [
                'limit' => 10,
            ]);
            if ($activityResponse->successful()) {
                $activityData = $activityResponse->json('data');
                $activities = $activityData['activities'] ?? $activityData ?? [];
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard activity fetch failed', ['error' => $e->getMessage()]);
        }

        try {
            $usageResponse = $this->apiRequest()->get($this->apiUrl() . '/api/admin/usage-stats', [
                'startDate' => now()->subDays(30)->utc()->toIso8601String(),
                'endDate' => now()->utc()->toIso8601String(),
            ]);
            if ($usageResponse->successful()) {
                $usageStats = $usageResponse->json('data');
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Dashboard usage stats fetch failed', ['error' => $e->getMessage()]);
        }

        $responsePayload = [
            'stats' => $stats,
            'activities' => $activities,
            'usageStats' => $usageStats,
            'initialRange' => $rangeQuery,
        ];

        if (request()->expectsJson()) {
            return response()->json(['data' => $responsePayload]);
        }

        return Inertia::render('admin/dashboard', $responsePayload);
    }
}
