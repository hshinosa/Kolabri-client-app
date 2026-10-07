<?php

namespace Tests\Feature;

use App\Models\CourseMaterial;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class LecturerMaterialsHubApiTest extends TestCase
{
    private string $courseId = '33333333-3333-3333-3333-333333333333';

    protected function setUp(): void
    {
        parent::setUp();
        $this->createSchema();
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

        Schema::create('course_weeks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('course_id');
            $table->unsignedInteger('week_index');
            $table->string('title');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

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

        Schema::create('course_week_materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('course_week_id');
            $table->uuid('course_material_id');
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

    public function test_hub_lists_module_child_in_pool_when_not_assigned_to_week(): void
    {
        $moduleChildId = (string) Str::uuid();
        CourseMaterial::create([
            'id' => $moduleChildId,
            'course_id' => $this->courseId,
            'title' => 'Modul-only PDF',
            'file_name' => 'mod.pdf',
            'file_path' => 'materials/mod.pdf',
            'file_type' => 'application/pdf',
            'file_size' => 100,
        ]);

        Http::fake([
            "http://localhost:3000/api/courses/{$this->courseId}/knowledge-base" => Http::response(['data' => []], 200),
        ]);

        $response = $this->lecturerSession()->getJson(
            route('lecturer.courses.materials-hub.show', ['course' => $this->courseId])
        );

        $response->assertOk();
        $response->assertJsonPath('materials.0.id', $moduleChildId);
        $response->assertJsonPath('pool.0.id', $moduleChildId);
        $response->assertJsonStructure(['ai_index_configured', 'kb_by_material_id', 'weeks']);
    }
}