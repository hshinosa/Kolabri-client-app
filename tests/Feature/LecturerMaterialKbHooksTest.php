<?php

namespace Tests\Feature;

use App\Models\CourseMaterial;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class LecturerMaterialKbHooksTest extends TestCase
{
    private string $courseId = '44444444-4444-4444-4444-444444444444';

    protected function setUp(): void
    {
        parent::setUp();
        $this->createSchema();
        Storage::fake('public');
        Storage::fake('private');
        config([
            'services.api.base_url' => 'http://localhost:3000',
            'services.api.internal_secret' => 'test-internal-secret',
        ]);
        // P2-01 guard (assertCourseOwnership) query tabel courses — sediakan
        // schema + row pemilik agar alur uji tetap utuh.
        Schema::dropIfExists('courses');
        Schema::create('courses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('owner_id')->nullable(); // courses memakai owner_id (accessor lecturer_id)
            $table->string('name')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });
        \Illuminate\Support\Facades\DB::table('courses')->insert([
            'id' => $this->courseId,
            'owner_id' => 'lec-1',
            'name' => 'Kursus Uji',
        ]);

    }

    private function createSchema(): void
    {
        Schema::dropIfExists('user_avatars');
        Schema::create('user_avatars', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id')->unique();
            $table->string('original_path', 500)->nullable();
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('medium_path', 500)->nullable();
            $table->string('large_path', 500)->nullable();
            $table->string('original_filename', 255)->nullable();
            $table->string('mime_type', 50)->nullable();
            $table->unsignedInteger('file_size')->default(0);
            $table->timestamps();
        });

        Schema::dropIfExists('course_week_materials');
        Schema::dropIfExists('course_materials');
        Schema::dropIfExists('course_weeks');

        Schema::create('course_materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('course_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type')->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->uuid('uploaded_by')->nullable();
            $table->integer('view_count')->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    private function lecturerSession(): self
    {
        return $this->withSession([
            'jwt' => $this->createFakeJwt(['sub' => 'lec-1']),
            'user' => [
                'id' => 'lec-1',
                'name' => 'Lecturer',
                'email' => 'lec@test.com',
                'role' => 'lecturer',
            ],
        ]);
    }

    public function test_upload_posts_queue_course_material_when_secret_set(): void
    {
        Http::fake([
            'http://localhost:3000/api/internal/knowledge-base/queue-course-material' => Http::response(['data' => ['id' => 'kb-1']], 200),
        ]);

        $file = UploadedFile::fake()->create('notes.pdf', 50, 'application/pdf');

        $response = $this->lecturerSession()->postJson(
            route('lecturer.courses.materials.store', ['course' => $this->courseId]),
            [
                'title' => 'Notes',
                'file' => $file,
            ]
        );

        $response->assertCreated();
        $response->assertJsonPath('meta.ai_index_configured', true);
        $response->assertJsonPath('meta.ai_index_queued', true);
        Http::assertSent(function ($request) {
            if ($request->url() !== 'http://localhost:3000/api/internal/knowledge-base/queue-course-material') {
                return false;
            }
            $data = $request->data();

            return ($data['course_id'] ?? null) === $this->courseId
                && isset($data['course_material_id'])
                && ($data['file_name'] ?? null) === 'notes.pdf'
                && ($data['mime_type'] ?? null) === 'application/pdf'
                && $request->hasHeader('X-Internal-Secret', 'test-internal-secret');
        });
    }

    public function test_upload_skips_queue_when_internal_secret_empty(): void
    {
        config(['services.api.internal_secret' => '']);

        Http::fake();

        $file = UploadedFile::fake()->create('solo.pdf', 10, 'application/pdf');

        $response = $this->lecturerSession()->postJson(
            route('lecturer.courses.materials.store', ['course' => $this->courseId]),
            [
                'file' => $file,
            ]
        );

        $response->assertCreated();
        $response->assertJsonPath('meta.ai_index_configured', false);
        $response->assertJsonPath('meta.ai_index_queued', false);
    }

    public function test_upload_reports_queue_not_triggered_when_internal_api_rejects(): void
    {
        Http::fake([
            'http://localhost:3000/api/internal/knowledge-base/queue-course-material' => Http::response(['message' => 'bad gateway'], 502),
        ]);

        $file = UploadedFile::fake()->create('reject.pdf', 10, 'application/pdf');

        $response = $this->lecturerSession()->postJson(
            route('lecturer.courses.materials.store', ['course' => $this->courseId]),
            [
                'file' => $file,
            ]
        );

        $response->assertCreated();
        $response->assertJsonPath('meta.ai_index_configured', true);
        $response->assertJsonPath('meta.ai_index_queued', false);
    }

    public function test_destroy_posts_delete_course_material_kb(): void
    {
        $materialId = (string) Str::uuid();
        CourseMaterial::create([
            'id' => $materialId,
            'course_id' => $this->courseId,
            'title' => 'Del me',
            'file_name' => 'del.pdf',
            'file_path' => "materials/{$this->courseId}/del.pdf",
            'file_type' => 'application/pdf',
            'file_size' => 10,
        ]);
        Storage::disk('public')->put("materials/{$this->courseId}/del.pdf", 'x');

        Http::fake([
            'http://localhost:3000/api/internal/knowledge-base/delete-course-material' => Http::response(['data' => ['success' => true]], 200),
        ]);

        $response = $this->lecturerSession()->deleteJson(
            route('lecturer.courses.materials.destroy', ['course' => $this->courseId, 'materialId' => $materialId])
        );

        $response->assertOk();
        $this->assertDatabaseMissing('course_materials', ['id' => $materialId]);

        Http::assertSent(function ($request) use ($materialId) {
            if ($request->url() !== 'http://localhost:3000/api/internal/knowledge-base/delete-course-material') {
                return false;
            }
            $data = $request->data();

            return ($data['course_id'] ?? null) === $this->courseId
                && ($data['course_material_id'] ?? null) === $materialId;
        });
    }
}
