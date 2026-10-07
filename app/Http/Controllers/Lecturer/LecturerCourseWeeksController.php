<?php

namespace App\Http\Controllers\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\CourseWeek;
use App\Models\CourseWeekMaterial;
use App\Services\CoreApiInternalClient;
use App\Services\CoreApiFilePath;
use App\Services\CourseWeekIndexService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LecturerCourseWeeksController extends Controller
{
    public function __construct(
        private readonly CoreApiInternalClient $coreApiInternal
    ) {}
    /**
     * M7 (F-09): weeks is a write surface for the course syllabus — every
     * method must verify the acting lecturer owns the course. Admin passes.
     */
    private function assertCourseOwnership(Request $request, string $course): void
    {
        $user = $request->input('auth_user') ?? session('user');
        $userId = is_array($user) ? ($user['id'] ?? null) : null;
        $role = is_array($user) ? ($user['role'] ?? null) : null;

        $courseModel = Course::where('id', $course)->first();
        if (! $courseModel) {
            abort(404, 'Course not found');
        }

        if ($role === 'admin') {
            return;
        }

        if (! $userId || $courseModel->lecturer_id !== $userId) {
            abort(403, 'Forbidden');
        }
    }

    public function index(Request $request, string $course): JsonResponse
    {
        $this->assertCourseOwnership($request, $course);

        $weeks = CourseWeek::where('course_id', $course)
            ->orderBy('sort_order')
            ->orderBy('week_index')
            ->with(['materials' => function ($q) {
                $q->orderBy('course_week_materials.sort_order');
            }])
            ->get();

        $assignedIds = CourseWeekMaterial::whereIn(
            'course_week_id',
            CourseWeek::where('course_id', $course)->pluck('id')
        )->pluck('course_material_id');

        $pool = CourseMaterial::where('course_id', $course)
            ->whereNotIn('id', $assignedIds)
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'weeks' => $weeks,
            'pool' => $pool,
        ]);
    }

    public function store(Request $request, string $course): JsonResponse
    {
        $this->assertCourseOwnership($request, $course);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $sortOrder = $validated['sort_order'] ?? CourseWeekIndexService::nextSortOrder($course);
        $nextIndex = (int) CourseWeek::where('course_id', $course)->max('week_index') + 1;

        $week = CourseWeek::create([
            'id' => (string) Str::uuid(),
            'course_id' => $course,
            'week_index' => max(1, $nextIndex),
            'title' => $validated['title'],
            'sort_order' => $sortOrder,
        ]);

        CourseWeekIndexService::renumberForCourse($course);

        return response()->json(['data' => $week->fresh()], 201);
    }

    public function update(Request $request, string $course, string $weekId): JsonResponse
    {
        $this->assertCourseOwnership($request, $course);

        $week = CourseWeek::where('course_id', $course)->findOrFail($weekId);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $week->update($validated);

        if (array_key_exists('sort_order', $validated)) {
            CourseWeekIndexService::renumberForCourse($course);
        }

        return response()->json(['data' => $week->fresh()]);
    }

    public function destroy(Request $request, string $course, string $weekId): JsonResponse
    {
        $this->assertCourseOwnership($request, $course);

        $week = CourseWeek::where('course_id', $course)->findOrFail($weekId);
        $week->delete();
        CourseWeekIndexService::renumberForCourse($course);

        return response()->json(['message' => 'Minggu berhasil dihapus. Materi tetap di pool.']);
    }

    public function reorderWeeks(Request $request, string $course): JsonResponse
    {
        $this->assertCourseOwnership($request, $course);

        $validated = $request->validate([
            'order' => 'required|array|min:1',
            'order.*.id' => 'required|string',
            'order.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['order'] as $item) {
            CourseWeek::where('id', $item['id'])
                ->where('course_id', $course)
                ->update(['sort_order' => $item['sort_order']]);
        }

        CourseWeekIndexService::renumberForCourse($course);

        return response()->json(['message' => 'Urutan minggu diperbarui.']);
    }

    public function assignMaterial(Request $request, string $course, string $weekId): JsonResponse
    {
        $this->assertCourseOwnership($request, $course);

        $week = CourseWeek::where('course_id', $course)->findOrFail($weekId);

        $validated = $request->validate([
            'course_material_id' => 'required|string',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $material = CourseMaterial::where('course_id', $course)
            ->findOrFail($validated['course_material_id']);

        $already = CourseWeekMaterial::where('course_week_id', $weekId)
            ->where('course_material_id', $material->id)
            ->exists();
        if ($already) {
            return response()->json(['message' => 'Materi sudah ada di minggu ini.'], 422);
        }

        $maxSort = CourseWeekMaterial::where('course_week_id', $weekId)->max('sort_order') ?? 0;

        $link = CourseWeekMaterial::create([
            'id' => (string) Str::uuid(),
            'course_week_id' => $weekId,
            'course_material_id' => $material->id,
            'sort_order' => $validated['sort_order'] ?? ($maxSort + 1),
        ]);

        // Path harus di-resolve untuk core-api (shared volume) — Storage::disk()->path()
        // menghasilkan path container Laravel yang tidak terbaca core-api, sehingga
        // re-ingest dengan metadata week_index tidak pernah terjadi (bug E2E 2026-10-06).
        $absolutePath = CoreApiFilePath::resolve($material->file_path);
        $this->coreApiInternal->linkCourseMaterial([
            'course_id' => $course,
            'course_material_id' => $material->id,
            'week_id' => $weekId,
            'week_index' => $week->week_index,
            'file_path' => $absolutePath,
            'file_name' => $material->file_name,
            'mime_type' => $material->file_type ?? 'application/octet-stream',
            'file_size' => (int) $material->file_size,
            'uploaded_by' => (string) ($material->uploaded_by ?? data_get($request->input('auth_user'), 'id', session('user.id'))),
        ]);

        return response()->json(['data' => $link->load('material')], 201);
    }

    public function unassignMaterial(Request $request, string $course, string $weekId, string $materialId): JsonResponse
    {
        $this->assertCourseOwnership($request, $course);

        CourseWeek::where('course_id', $course)->findOrFail($weekId);
        CourseMaterial::where('course_id', $course)->findOrFail($materialId);

        CourseWeekMaterial::where('course_week_id', $weekId)
            ->where('course_material_id', $materialId)
            ->delete();

        $this->coreApiInternal->unassignCourseMaterial($course, $materialId);

        return response()->json(['message' => 'Materi dikeluarkan dari minggu.']);
    }

    public function reorderWeekMaterials(Request $request, string $course, string $weekId): JsonResponse
    {
        $this->assertCourseOwnership($request, $course);

        CourseWeek::where('course_id', $course)->findOrFail($weekId);

        $validated = $request->validate([
            'order' => 'required|array|min:1',
            'order.*.course_material_id' => 'required|string',
            'order.*.sort_order' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($weekId, $validated) {
            foreach ($validated['order'] as $item) {
                CourseWeekMaterial::where('course_week_id', $weekId)
                    ->where('course_material_id', $item['course_material_id'])
                    ->update(['sort_order' => $item['sort_order']]);
            }
        });

        return response()->json(['message' => 'Urutan materi minggu diperbarui.']);
    }
}