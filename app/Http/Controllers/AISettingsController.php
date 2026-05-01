<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class AISettingsController extends Controller
{
    protected function apiUrl(): string
    {
        return config('services.api.base_url');
    }

    protected function apiRequest()
    {
        return Http::withToken(session('jwt'));
    }

    public function index(Request $request)
    {
        try {
            $response = $this->apiRequest()->get(
                $this->apiUrl() . '/api/admin/ai-providers',
                $request->query()
            );

            $payload = $response->json();

            if (!$response->successful()) {
                return response()->json($payload, $response->status());
            }

            return Inertia::render('admin/ai-settings', [
                'providers' => $payload['data'] ?? [],
                'meta' => $payload['meta'] ?? null,
                'filters' => $request->query(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch AI providers',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function show(string $id)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/admin/ai-providers/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch AI provider',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/ai-providers',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to create AI provider',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $response = $this->apiRequest()->put(
                $this->apiUrl() . "/api/admin/ai-providers/{$id}",
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to update AI provider',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        try {
            $response = $this->apiRequest()->delete($this->apiUrl() . "/api/admin/ai-providers/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to delete AI provider',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function test(Request $request, string $id)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . "/api/admin/ai-providers/{$id}/test",
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to test AI provider connection',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function activate(string $id)
    {
        try {
            $response = $this->apiRequest()->post($this->apiUrl() . "/api/admin/ai-providers/{$id}/activate");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to activate AI provider',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function updateFallbackOrder(Request $request)
    {
        try {
            $response = $this->apiRequest()->put(
                $this->apiUrl() . '/api/admin/ai-providers/fallback-order',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to update fallback order',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function comparisonPage()
    {
        return Inertia::render('admin/ai-comparison');
    }

    public function compare(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/ai-compare',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to compare AI models',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function usageStats(Request $request)
    {
        try {
            $response = $this->apiRequest()->get(
                $this->apiUrl() . '/api/admin/usage-stats',
                $request->query()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch usage stats',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function usageReport(string $userId, int $month, int $year)
    {
        try {
            $response = $this->apiRequest()->get(
                $this->apiUrl() . "/api/admin/usage-report/{$userId}/{$month}/{$year}"
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch usage report',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }
}
