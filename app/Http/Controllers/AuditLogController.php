<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class AuditLogController extends Controller
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
                $this->apiUrl() . '/api/admin/audit-logs',
                $request->query() + ['limit' => $request->query('limit', 50)]
            );

            $payload = $response->json();

            if (!$response->successful()) {
                return response()->json($payload, $response->status());
            }

            if ($request->expectsJson() || $request->query('format') === 'json') {
                return response()->json($payload, $response->status());
            }

            return Inertia::render('admin/audit-log', [
                'logs' => $payload['data'] ?? [],
                'meta' => $payload['meta'] ?? [
                    'limit' => (int) $request->query('limit', 50),
                    'offset' => (int) $request->query('offset', 0),
                    'total' => 0,
                    'hasMore' => false,
                ],
                'filters' => [
                    'action' => $request->query('action'),
                    'entityType' => $request->query('entityType'),
                    'userId' => $request->query('userId'),
                    'startDate' => $request->query('startDate'),
                    'endDate' => $request->query('endDate'),
                    'limit' => (int) $request->query('limit', 50),
                    'offset' => (int) $request->query('offset', 0),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch audit logs',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function entityHistory(string $entityType, string $entityId)
    {
        try {
            $response = $this->apiRequest()->get(
                $this->apiUrl() . "/api/admin/audit-logs/entity/{$entityType}/{$entityId}"
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch entity audit history',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }
}
