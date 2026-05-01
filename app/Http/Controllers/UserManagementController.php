<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class UserManagementController extends Controller
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
        $users = [];
        $pagination = [
            'page' => (int) $request->query('page', 1),
            'limit' => (int) $request->query('limit', 20),
            'total' => 0,
            'totalPages' => 1,
        ];

        try {
            $response = $this->apiRequest()->get(
                $this->apiUrl() . '/api/admin/users',
                $request->query()
            );

            if ($response->successful()) {
                $payload = $response->json();
                $users = $payload['data'] ?? [];
                $pagination = $payload['meta'] ?? $pagination;
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to fetch users', ['error' => $e->getMessage()]);
        }

        $responsePayload = [
            'users' => $users,
            'filters' => $request->query(),
            'pagination' => $pagination,
        ];

        if ($request->expectsJson()) {
            return response()->json(['data' => $responsePayload]);
        }

        return Inertia::render('admin/user-management', $responsePayload);
    }

    public function show($id)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/admin/users/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch user',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/users',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to create user',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $response = $this->apiRequest()->put(
                $this->apiUrl() . "/api/admin/users/{$id}",
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to update user',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $response = $this->apiRequest()->delete($this->apiUrl() . "/api/admin/users/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to delete user',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function resetPassword(Request $request, $id)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . "/api/admin/users/{$id}/reset-password",
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to reset user password',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function bulkDelete(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/users/bulk-delete',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to bulk delete users',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function bulkRoleChange(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/users/bulk-role-change',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to bulk update user roles',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function bulkImport(Request $request)
    {
        try {
            if (!$request->hasFile('file')) {
                return response()->json([
                    'error' => [
                        'message' => 'CSV file is required',
                    ],
                ], 422);
            }

            $file = $request->file('file');
            $response = $this->apiRequest()
                ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                ->post($this->apiUrl() . '/api/admin/users/bulk-import');

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to import users from CSV',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }
}
