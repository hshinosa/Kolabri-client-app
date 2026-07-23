<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\CourseMaterial;
use App\Services\WeekMaterialAccessService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentSessionMaterialsController extends Controller
{
    public function __construct(
        private readonly WeekMaterialAccessService $access
    ) {}

    public function indexByCourse(string $course, string $sessionDiscussion): JsonResponse
    {
        return $this->materialsPayload($course, $sessionDiscussion, null);
    }

    public function index(string $group, string $sessionDiscussion): JsonResponse
    {
        $chat = $this->fetchSessionDiscussion($sessionDiscussion);
        if (! $chat) {
            return response()->json(['message' => 'Sesi diskusi tidak ditemukan'], 404);
        }

        if (($chat['groupId'] ?? null) !== $group) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $courseId = $this->resolveCourseIdForGroup($group);
        if (! $courseId) {
            return response()->json(['message' => 'Course not found for group'], 404);
        }

        return $this->materialsPayload($courseId, $sessionDiscussion, $group);
    }

    private function materialsPayload(string $course, string $sessionDiscussion, ?string $expectedGroupId): JsonResponse
    {
        $chat = $this->fetchSessionDiscussion($sessionDiscussion);
        if (! $chat) {
            return response()->json(['message' => 'Sesi diskusi tidak ditemukan'], 404);
        }

        if ($expectedGroupId !== null && ($chat['groupId'] ?? null) !== $expectedGroupId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $weekId = $chat['weekId'] ?? null;
        if (! $weekId) {
            return response()->json([
                'session_week' => null,
                'primary' => [],
                'earlier' => [],
                'cited' => [],
                'message' => 'Sesi belum terikat minggu kuliah.',
            ]);
        }

        $bundled = $this->access->materialsForSessionWeek($course, $weekId);

        return response()->json([
            'session_week' => $bundled['session_week'] ? [
                'id' => $bundled['session_week']->id,
                'week_index' => $bundled['session_week']->week_index,
                'title' => $bundled['session_week']->title,
            ] : null,
            'primary' => $bundled['primary']->map(fn ($row) => $this->serializeRow($row))->values(),
            'earlier' => $bundled['earlier']->map(fn ($row) => $this->serializeRow($row))->values(),
            'cited' => [],
        ]);
    }

    private function serializeRow(array $row): array
    {
        $material = $row['material'];

        return [
            'week_index' => $row['week_index'],
            'week_id' => $row['week_id'],
            'week_title' => $row['week_title'],
            'material' => [
                'id' => $material->id,
                'title' => $material->title,
                'description' => $material->description,
                'file_name' => $material->file_name,
                'file_type' => $material->file_type,
                'file_size' => $material->file_size,
            ],
        ];
    }

    private function resolveCourseIdForGroup(string $groupId): ?string
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/groups/{$groupId}");
            if (! $response->successful()) {
                return null;
            }

            return $response->json('data.courseId') ?? $response->json('data.course.id');
        } catch (ConnectionException|RequestException $e) {
            Log::error('resolveCourseIdForGroup failed', ['error' => $e->getMessage()]);

            return null;
        }
    }

    public function stream(Request $request, string $course, string $materialId): StreamedResponse|JsonResponse
    {
        $material = CourseMaterial::where('course_id', $course)->findOrFail($materialId);

        // Check 'private' disk first (new uploads), then fall back to 'public' (legacy files)
        $disk = Storage::disk('private')->exists($material->file_path) ? 'private' : 'public';
        if (! Storage::disk($disk)->exists($material->file_path)) {
            return response()->json(['message' => 'File tidak ditemukan.'], 404);
        }

        // When sessionDiscussion is provided, enforce week-cap access control.
        $sessionDiscussionId = $request->query('sessionDiscussion');
        if (is_string($sessionDiscussionId) && $sessionDiscussionId !== '') {
            $chat = $this->fetchSessionDiscussion($sessionDiscussionId);
            if (! $chat) {
                return response()->json(['message' => 'Sesi diskusi tidak ditemukan'], 404);
            }

            $weekId = $chat['weekId'] ?? null;
            if ($weekId) {
                $maxIndex = $this->access->maxWeekIndex($course, $weekId);
                if ($maxIndex !== null && ! $this->access->isMaterialAllowedForSession($course, $materialId, $maxIndex)) {
                    return response()->json(['message' => 'Materi di luar cap minggu sesi.'], 403);
                }
            }
        }

        return Storage::disk($disk)->response(
            $material->file_path,
            $material->file_name,
            ['Content-Type' => $material->file_type ?? 'application/octet-stream']
        );
    }

    private function fetchSessionDiscussion(string $sessionDiscussionId): ?array
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/groups/session-discussions/{$sessionDiscussionId}");
            if (! $response->successful()) {
                return null;
            }

            return $response->json('data');
        } catch (ConnectionException|RequestException $e) {
            Log::error('fetchSessionDiscussion failed', ['error' => $e->getMessage()]);

            return null;
        }
    }
}