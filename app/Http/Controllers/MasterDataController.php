<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class MasterDataController extends Controller
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
            $tab = $request->query('tab', 'active');
            $endpoint = $tab === 'archived'
                ? '/api/admin/courses/archived'
                : '/api/admin/courses';

            $coursesResponse = $this->apiRequest()->get(
                $this->apiUrl() . $endpoint,
                $request->query()
            );

            $coursesPayload = $coursesResponse->json();

            if (!$coursesResponse->successful()) {
                return response()->json($coursesPayload, $coursesResponse->status());
            }

            $lecturersResponse = $this->apiRequest()->get(
                $this->apiUrl() . '/api/admin/users',
                [
                    'role' => 'lecturer',
                    'limit' => 100,
                ]
            );

            $lecturersPayload = $lecturersResponse->json();
            $courseData = $coursesPayload['data'] ?? [];

            $responsePayload = [
                'courses' => $courseData['courses'] ?? $courseData,
                'pagination' => $courseData['pagination'] ?? $coursesPayload['pagination'] ?? [
                    'page' => (int) $request->query('page', 1),
                    'limit' => (int) $request->query('limit', 10),
                    'total' => is_array($courseData['courses'] ?? $courseData) ? count($courseData['courses'] ?? $courseData) : 0,
                    'totalPages' => 1,
                ],
                'filters' => [
                    'search' => $request->query('search'),
                    'ownerId' => $request->query('ownerId'),
                ],
                'tab' => $tab,
                'lecturers' => $lecturersPayload['data']['users'] ?? $lecturersPayload['data'] ?? [],
                'message' => $coursesPayload['message'] ?? null,
            ];

            if ($request->expectsJson()) {
                return response()->json([
                    'data' => $responsePayload,
                ]);
            }

            return Inertia::render('admin/master-data', $responsePayload);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch courses',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function templatesPage()
    {
        try {
            $templatesResponse = $this->apiRequest()->get($this->apiUrl() . '/api/admin/course-templates');
            $templatesPayload = $templatesResponse->json();

            if (!$templatesResponse->successful()) {
                return response()->json($templatesPayload, $templatesResponse->status());
            }

            $lecturersResponse = $this->apiRequest()->get(
                $this->apiUrl() . '/api/admin/users',
                [
                    'role' => 'lecturer',
                    'limit' => 100,
                ]
            );

            $lecturersPayload = $lecturersResponse->json();

            return Inertia::render('admin/templates', [
                'templates' => $templatesPayload['data'] ?? [],
                'lecturers' => $lecturersPayload['data']['users'] ?? $lecturersPayload['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch templates',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/admin/courses/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch course details',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/courses',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to create course',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $response = $this->apiRequest()->put(
                $this->apiUrl() . "/api/admin/courses/{$id}",
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to update course',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $response = $this->apiRequest()->delete($this->apiUrl() . "/api/admin/courses/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to delete course',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function clone(Request $request, $id)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . "/api/admin/courses/{$id}/clone",
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to clone course',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function listTemplates()
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . '/api/admin/course-templates');

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch templates',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function showTemplate($id)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/admin/course-templates/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to fetch template details',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function storeTemplate(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/course-templates',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to create template',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function destroyTemplate($id)
    {
        try {
            $response = $this->apiRequest()->delete($this->apiUrl() . "/api/admin/course-templates/{$id}");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to delete template',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function createFromTemplate(Request $request, $templateId)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . "/api/admin/courses/from-template/{$templateId}",
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to create course from template',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function archive($id)
    {
        try {
            $response = $this->apiRequest()->post($this->apiUrl() . "/api/admin/courses/{$id}/archive");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to archive course',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function restore($id)
    {
        try {
            $response = $this->apiRequest()->post($this->apiUrl() . "/api/admin/courses/{$id}/restore");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to restore course',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function permanentDelete($id)
    {
        try {
            $response = $this->apiRequest()->delete($this->apiUrl() . "/api/admin/courses/{$id}/permanent");

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to permanently delete course',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function bulkActivate(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/courses/bulk-activate',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to bulk activate courses',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    public function bulkDeactivate(Request $request)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . '/api/admin/courses/bulk-deactivate',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to bulk deactivate courses',
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
                ->post($this->apiUrl() . '/api/admin/courses/bulk-import');

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'message' => 'Failed to import courses from CSV',
                    'details' => $e->getMessage(),
                ],
            ], 500);
        }
    }
}
