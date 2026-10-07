<?php

namespace App\Http\Controllers\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\MaterialView;
use App\Services\CoreApiFilePath;
use App\Services\CoreApiInternalClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LecturerMaterialsController extends Controller
{
    public function __construct(
        private readonly CoreApiInternalClient $coreApiInternal
    ) {}

    /**
     * P2-01 (pass2 HIGH): materials adalah permukaan tulis/baca kursus —
     * setiap method wajib verifikasi pemilik kursus. Admin lolos.
     * (Pola identik dgn LecturerCourseWeeksController::assertCourseOwnership.)
     */
    private function assertCourseOwnership(string $course): void
    {
        $request = request();
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

    private function resolveCoreApiFilePath(string $relativePath, string $disk): string
    {
        return CoreApiFilePath::resolve($relativePath, $disk);
    }
    // STORAGE MIGRATION STRATEGY (H3 file-upload hardening):
    // - NEW uploads go to the 'private' disk (not web-accessible).
    // - Legacy files remain on 'public' disk; do NOT migrate in-place (would break URLs).
    // - Read paths (destroy, reindex, streaming) check 'private' first, fall back to 'public'.
    // - Chat attachments stay on 'public' (see ChatUploadController).
    /**
     * Daftar materi kelas (route GET materials sebelumnya 500: method ini tidak ada).
     */
    public function index(string $course): JsonResponse
    {
        $this->assertCourseOwnership($course);

        $materials = CourseMaterial::where('course_id', $course)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $materials]);
    }

    /**
     * Upload a material.
     */
    public function store(Request $request, string $course): JsonResponse
    {
        $this->assertCourseOwnership($course);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            // M6/F-10: explicit extension allowlist (mirrors the upload
            // input in UnifiedMaterialsTab). `mimes` guesses the type from
            // the file CONTENT, so an HTML payload is rejected regardless of
            // the Content-Type header the client sends.
            'file' => 'required|file|max:51200|mimes:pdf,docx,pptx,txt,md,csv,png,jpg,jpeg,gif,webp,zip', // 50MB max
            'extract_images' => 'sometimes|boolean',
            'perform_ocr' => 'sometimes|boolean',
        ]);

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $fileType = $file->getMimeType();
        $fileSize = $file->getSize();

        // Store file
        $path = $file->store("materials/{$course}", 'private');

        $title = $validated['title'] ?? null;
        if (empty($title)) {
            $title = pathinfo($fileName, PATHINFO_FILENAME);
        }

        $material = CourseMaterial::create([
            'id' => (string) Str::uuid(),
            'course_id' => $course,
            'title' => $title,
            'description' => $validated['description'] ?? null,
            'file_name' => $fileName,
            'file_path' => $path,
            'file_type' => $fileType,
            'file_size' => $fileSize,
            'uploaded_by' => session('user.id') ?? null,
            'sort_order' => (CourseMaterial::where('course_id', $course)
                ->max('sort_order') ?? 0) + 1,
        ]);

        $absolutePath = $this->resolveCoreApiFilePath($path, 'private');
        $uploaderId = (string) (session('user.id') ?? '00000000-0000-0000-0000-000000000000');
        $queuePayload = [
            'course_id' => $course,
            'course_material_id' => $material->id,
            'file_path' => $absolutePath,
            'file_name' => $fileName,
            'mime_type' => $fileType ?? 'application/octet-stream',
            'file_size' => (int) $fileSize,
            'uploaded_by' => $uploaderId,
        ];
        if ($request->boolean('extract_images')) {
            $queuePayload['extract_images'] = true;
        }
        if ($request->boolean('perform_ocr')) {
            $queuePayload['perform_ocr'] = true;
        }
        $queueTriggered = $this->coreApiInternal->queueCourseMaterial($queuePayload);

        return response()->json([
            'data' => $material,
            'meta' => [
                'ai_index_configured' => $this->coreApiInternal->isConfigured(),
                'ai_index_queued' => $queueTriggered,
            ],
        ], 201);
    }

    /**
     * Update material metadata.
     */
    public function update(Request $request, string $course, string $materialId): JsonResponse
    {
        $this->assertCourseOwnership($course);

        $material = CourseMaterial::where('course_id', $course)->findOrFail($materialId);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $material->update($validated);

        return response()->json(['data' => $material]);
    }

    /**
     * Delete material.
     */
    public function destroy(string $course, string $materialId): JsonResponse
    {
        $this->assertCourseOwnership($course);

        $material = CourseMaterial::where('course_id', $course)->findOrFail($materialId);

        // Delete file from storage
        $this->coreApiInternal->deleteCourseMaterialKb($course, $materialId);

        // Check both 'private' (new) and 'public' (legacy) disks
        $disk = Storage::disk('private')->exists($material->file_path) ? 'private' : 'public';
        if (Storage::disk($disk)->exists($material->file_path)) {
            Storage::disk($disk)->delete($material->file_path);
        }

        $material->delete();

        return response()->json(['message' => 'Materi berhasil dihapus.']);
    }

    /**
     * Record a material view.
     */
    public function recordView(Request $request, string $course, string $materialId): JsonResponse
    {
        $this->assertCourseOwnership($course);

        $material = CourseMaterial::where('course_id', $course)->findOrFail($materialId);

        $studentId = session('user.id');
        if (!$studentId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check if already viewed recently (within 1 hour)
        $recentView = MaterialView::where('material_id', $materialId)
            ->where('student_id', $studentId)
            ->where('viewed_at', '>=', now()->subHour())
            ->exists();

        if (!$recentView) {
            MaterialView::create([
                'id' => (string) Str::uuid(),
                'material_id' => $materialId,
                'student_id' => $studentId,
            ]);

            $material->increment('view_count');
        }

        return response()->json([
            'view_count' => $material->fresh()->view_count,
        ]);
    }

    /**
     * Get material view stats.
     */
    public function viewStats(string $course, string $materialId): JsonResponse
    {
        $this->assertCourseOwnership($course);

        $material = CourseMaterial::where('course_id', $course)->findOrFail($materialId);

        $totalViews = $material->view_count;
        $uniqueViewers = MaterialView::where('material_id', $materialId)
            ->distinct('student_id')
            ->count();

        $recentViews = MaterialView::where('material_id', $materialId)
            ->orderBy('viewed_at', 'desc')
            ->limit(10)
            ->get(['student_id', 'viewed_at']);

        return response()->json([
            'total_views' => $totalViews,
            'unique_viewers' => $uniqueViewers,
            'recent_views' => $recentViews,
        ]);
    }

    /**
     * Re-trigger KB indexing for an existing material.
     */
    public function reindex(string $course, string $materialId): JsonResponse
    {
        $this->assertCourseOwnership($course);

        $material = CourseMaterial::where('course_id', $course)->findOrFail($materialId);

        // Check both 'private' (new) and 'public' (legacy) disks
        $disk = Storage::disk('private')->exists($material->file_path) ? 'private' : 'public';
        if (! Storage::disk($disk)->exists($material->file_path)) {
            return response()->json(['message' => 'File tidak ditemukan di storage.'], 404);
        }

        $absolutePath = $this->resolveCoreApiFilePath($material->file_path, $disk);
        $uploaderId = (string) (session('user.id') ?? '00000000-0000-0000-0000-000000000000');

        $queueTriggered = $this->coreApiInternal->queueCourseMaterial([
            'course_id' => $course,
            'course_material_id' => $material->id,
            'file_path' => $absolutePath,
            'file_name' => $material->file_name,
            'mime_type' => $material->file_type ?? 'application/octet-stream',
            'file_size' => (int) $material->file_size,
            'uploaded_by' => $uploaderId,
        ]);

        if (! $queueTriggered) {
            return response()->json([
                'message' => 'Antrian indeks gagal dikirim.',
                'meta' => ['ai_index_configured' => $this->coreApiInternal->isConfigured(), 'ai_index_queued' => false],
            ], 502);
        }

        return response()->json([
            'message' => 'Antrian indeks berhasil dikirim.',
            'meta' => ['ai_index_configured' => $this->coreApiInternal->isConfigured(), 'ai_index_queued' => true],
        ]);
    }

}
