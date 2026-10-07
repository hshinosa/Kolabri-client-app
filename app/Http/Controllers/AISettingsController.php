<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AISettingsController extends Controller
{

    public function index(Request $request)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/admin/ai-providers', $request->query());

            $payload = $response->json();

            if (!$response->successful()) {
                return response()->json(['message' => $payload['message'] ?? 'Failed to fetch AI providers', 'code' => 'API_ERROR'], $response->status());
            }

            return Inertia::render('admin/ai-settings', [
                'providers' => $payload['data'] ?? [],
                'meta' => $payload['meta'] ?? null,
                'filters' => $request->query(),
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching providers', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch AI providers', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch AI providers', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function show(string $id)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/admin/ai-providers/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch AI provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch AI provider', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $response = $this->apiRequest()->post($this->apiUrl() . '/api/admin/ai-providers', $request->all());

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed creating provider', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to create AI provider', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to create AI provider', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function updateFallbackOrder(Request $request)
    {
        try {
            $response = $this->apiRequest()->put($this->apiUrl() . '/api/admin/ai-providers/fallback-order', $request->all());

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed updating fallback order', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to update fallback order', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to update fallback order', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $response = $this->apiRequest()->put($this->apiUrl() . "/api/admin/ai-providers/{$id}", $request->all());

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed updating provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to update AI provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to update AI provider', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function destroy(string $id)
    {
        try {
            $response = $this->apiRequest()->delete($this->apiUrl() . "/api/admin/ai-providers/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed deleting provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to delete AI provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to delete AI provider', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function setDefault(string $id)
    {
        try {
            $response = $this->apiRequest()->put($this->apiUrl() . "/api/admin/ai-providers/{$id}/default");

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed setting default provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to set default AI provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to set default AI provider', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function test(Request $request, string $id)
    {
        try {
            // P2-05 (pass2): body request (testPrompt) harus diteruskan —
            // dulu body [] → zod core-api menolak "Expected object, received
            // array" sehingga uji koneksi SELALU gagal400 dari UI.
            $response = $this->apiRequest()->post(
                $this->apiUrl() . "/api/admin/ai-providers/{$id}/test",
                $request->all(),
            );

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed testing provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to test AI provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to test AI provider', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function getModels(Request $request, string $provider)
    {
        try {
            $response = $this->apiRequest()->get(
                $this->apiUrl() . "/api/admin/ai-providers/{$provider}/models",
                $request->query()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching provider models', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch provider models', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch provider models', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function getComparisons(Request $request)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/admin/ai-comparisons', $request->query());

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching comparisons', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch AI comparisons', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch AI comparisons', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function getUsageStats(Request $request)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/admin/usage-stats', $request->query());

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching usage stats', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch usage stats', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch usage stats', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function activate(Request $request, string $id)
    {
        try {
            $response = $this->apiRequest()->post($this->apiUrl() . "/api/admin/ai-providers/{$id}/activate");
            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed activating provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to activate provider', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to activate provider', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function usageStats(Request $request)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/admin/usage-stats', $request->query());
            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching usage stats', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch usage stats', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch usage stats', 'code' => 'SERVER_ERROR'], 500);
        }
    }


    public function getEmbeddingConfig(Request $request)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/admin/embedding-config');

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching embedding config', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch embedding config', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch embedding config', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function updateEmbeddingConfig(Request $request)
    {
        try {
            $response = $this->apiRequest()->put($this->apiUrl() . '/api/admin/embedding-config', $request->all());

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed updating embedding config', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to update embedding config', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to update embedding config', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function usageReport(Request $request, string $userId, string $month, string $year)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/admin/usage-report/{$userId}/{$month}/{$year}");
            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching usage report', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch usage report', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch usage report', 'code' => 'SERVER_ERROR'], 500);
        }
    }

    public function getProviderStats(string $id)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/admin/ai-providers/{$id}/stats");

            return response()->json($response->json(), $response->status());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AISettingsController: connection failed fetching provider stats', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Service unavailable', 'code' => 'SERVICE_TIMEOUT'], 503);
        } catch (\Throwable $e) {
            Log::error('AISettingsController: failed to fetch provider stats', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch provider stats', 'code' => 'SERVER_ERROR'], 500);
        }
    }
}
