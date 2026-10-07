<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\CourseWeek;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class LecturerCourseWeeksApiTest extends TestCase
{
    private string $courseId = '22222222-2222-2222-2222-222222222222';

    protected function setUp(): void
    {
        parent::setUp();
        $this->createSchema();
        Storage::fake('local');
    }

    private function createSchema(): void
    {
        // M7: the ownership guard reads courses.owner_id — the weeks schema
        // needs a stand-in for that table.
        Schema::dropIfExists('courses');
        Schema::create('courses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->uuid('owner_id')->index();
            $table->timestamps();
        });

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

        Course::create([
            'id' => $this->courseId,
            'code' => 'IF203',
            'name' => 'Pemrograman Web',
            'owner_id' => 'lec-1',
        ]);

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

    public function test_lecturer_can_create_week_and_assign_pool_material(): void
    {
        $matId = (string) Str::uuid();
        $filePath = 'materials/slide.pdf';
        Storage::disk('local')->put($filePath, 'pdf-bytes');

        CourseMaterial::create([
            'id' => $matId,
            'course_id' => $this->courseId,
            'title' => 'Slide',
            'file_name' => 'slide.pdf',
            'file_path' => $filePath,
            'file_type' => 'application/pdf',
            'file_size' => 100,
        ]);

        $create = $this->lecturerSession()->postJson(
            route('lecturer.courses.weeks.store', ['course' => $this->courseId]),
            ['title' => 'Pendahuluan'],
        );

        $create->assertCreated();
        $weekId = $create->json('data.id');
        $this->assertNotEmpty($weekId);

        $assign = $this->lecturerSession()->postJson(
            route('lecturer.courses.weeks.materials.assign', [
                'course' => $this->courseId,
                'weekId' => $weekId,
            ]),
            ['course_material_id' => $matId],
        );

        $assign->assertCreated();
        $this->assertDatabaseHas('course_week_materials', [
            'course_week_id' => $weekId,
            'course_material_id' => $matId,
        ]);
    }

    public function test_student_cannot_create_week(): void
    {
        $response = $this
            ->withSession($this->studentSessionData())
            ->postJson(route('lecturer.courses.weeks.store', ['course' => $this->courseId]), [
                'title' => 'X',
            ]);

        $response->assertForbidden();
    }

    public function test_other_lecturer_cannot_read_or_write_weeks_of_a_foreign_course(): void
    {
        $foreignLecturer = [
            'jwt' => $this->createFakeJwt(['sub' => 'lec-2']),
            'user' => [
                'id' => 'lec-2',
                'name' => 'Dosen Lain',
                'email' => 'lec2@test.com',
                'role' => 'lecturer',
            ],
        ];

        $this->withSession($foreignLecturer)
            ->getJson(route('lecturer.courses.weeks.index', ['course' => $this->courseId]))
            ->assertForbidden();

        $this->withSession($foreignLecturer)
            ->postJson(route('lecturer.courses.weeks.store', ['course' => $this->courseId]), ['title' => 'X'])
            ->assertForbidden();

        $this->withSession($foreignLecturer)
            ->postJson(route('lecturer.courses.weeks.reorder', ['course' => $this->courseId]), [
                'order' => [['id' => (string) \Illuminate\Support\Str::uuid(), 'sort_order' => 0]],
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('course_weeks', ['course_id' => $this->courseId, 'title' => 'X']);
    }

    public function test_unknown_course_is_rejected(): void
    {
        $this->lecturerSession()
            ->getJson(route('lecturer.courses.weeks.index', ['course' => '99999999-9999-4999-8999-999999999999']))
            ->assertNotFound();
    }

    public function test_lecturer_can_reorder_weeks_and_renumber_indices(): void
    {
        $w1 = (string) Str::uuid();
        $w2 = (string) Str::uuid();
        CourseWeek::create([
            'id' => $w1,
            'course_id' => $this->courseId,
            'week_index' => 1,
            'title' => 'A',
            'sort_order' => 0,
        ]);
        CourseWeek::create([
            'id' => $w2,
            'course_id' => $this->courseId,
            'week_index' => 2,
            'title' => 'B',
            'sort_order' => 1,
        ]);

        $response = $this->lecturerSession()->postJson(
            route('lecturer.courses.weeks.reorder', ['course' => $this->courseId]),
            [
                'order' => [
                    ['id' => $w2, 'sort_order' => 0],
                    ['id' => $w1, 'sort_order' => 1],
                ],
            ],
        );

        $response->assertOk();
        $this->assertDatabaseHas('course_weeks', ['id' => $w2, 'week_index' => 1]);
        $this->assertDatabaseHas('course_weeks', ['id' => $w1, 'week_index' => 2]);
    }
}