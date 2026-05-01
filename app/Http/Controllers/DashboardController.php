<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Illuminate\Http\RedirectResponse;

class DashboardController extends Controller
{
    protected function apiUrl(): string
    {
        return config('services.api.base_url');
    }

    protected function apiRequest()
    {
        return Http::withToken(session('jwt'));
    }

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
            return Inertia::render('lecturer/dashboard');
        }

        return Inertia::render('student/dashboard');
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
                'startDate' => now()->subDays(30)->toIso8601String(),
                'endDate' => now()->toIso8601String(),
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
