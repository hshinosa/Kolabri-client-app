<?php

namespace App\Http\Controllers\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\CourseMaterial;
use App\Models\CourseWeek;
use App\Models\CourseWeekMaterial;
use App\Services\CoreApiInternalClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class LecturerMaterialsHubController extends Controller
{
    public function __construct(
        private readonly CoreApiInternalClient $coreApiInternal
    ) {}

    /**
     * P2-01 (pass2): hub menampilkan seluruh materi+kursus — wajib punya
     * kursus sendiri (admin lolos). Pola sama dgn weeks/materials.
     */
    private function assertCourseOwnership(string $course): void
    {
        $user = request()->input('auth_user') ?? session('user');
        $userId = is_array($user) ? ($user['id'] ?? null) : null;
        $role = is_array($user) ? ($user['role'] ?? null) : null;

        $courseModel = \App\Models\Course::where('id', $course)->first();
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

    /**
     * Unified lecturer materials hub (G1): all course materials, weeks, pool without module filter.
     */
    public function show(string $course): JsonResponse
    {
        $this->assertCourseOwnership($course);

        $weeks = CourseWeek::where('course_id', $course)
            ->orderBy('sort_order')
            ->orderBy('week_index')
            ->with(['materials' => function ($q) {
                $q->orderBy('course_week_materials.sort_order');
            }])
            ->get();

        $assignedMaterialIds = CourseWeekMaterial::query()
            ->whereIn('course_week_id', $weeks->pluck('id'))
            ->pluck('course_material_id')
            ->unique()
            ->values()
            ->all();

        $allMaterials = CourseMaterial::where('course_id', $course)
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get();

        $pool = $allMaterials->filter(fn ($m) => ! in_array($m->id, $assignedMaterialIds, true))->values();

        $kbStatus = [];
        try {
            $response = Http::withToken(session('jwt'))
                ->timeout(10)
                ->connectTimeout(5)
                ->get(config('services.api.base_url', 'http://localhost:3000')."/api/courses/{$course}/knowledge-base");
            if ($response->successful()) {
                foreach ($response->json('data', []) as $row) {
                    $matId = $row['courseMaterialId'] ?? $row['course_material_id'] ?? null;
                    if ($matId) {
                        $kbStatus[$matId] = [
                            'vector_status' => $row['vectorStatus'] ?? $row['vector_status'] ?? 'pending',
                            'knowledge_base_id' => $row['id'] ?? null,
                            'error_message' => $row['errorMessage'] ?? $row['error_message'] ?? null,
                        ];
                    }
                }
            }
        } catch (\Throwable) {
            /* frontend may poll KB separately */
        }

        return response()->json([
            'materials' => $allMaterials,
            'pool' => $pool,
            'weeks' => $weeks,
            'assigned_material_ids' => $assignedMaterialIds,
            'kb_by_material_id' => (object) $kbStatus,
            'ai_index_configured' => $this->coreApiInternal->isConfigured(),
        ]);
    }
}