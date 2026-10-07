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

/**
 * M6 / F-10: material uploads must be validated by content (not by the
 * client's Content-Type) and the stream endpoint must never render HTML
 * inline in the kolabri.web.id origin.
 */
class MaterialUploadMimeTest extends TestCase
{
    private string $courseId = '33333333-3333-4333-8333-333333333333';

    private string $studentId = '9b9e224b-a29e-45cb-8730-e9e47f928124';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('private');
        Storage::fake('public');
        Http::fake(['*' => Http::response(['ok' => true], 200)]);

        Schema::dropIfExists('course_materials');
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

        $this->enrollStudent($this->studentId, $this->courseId);
    }

    /**
     * Build a real (non-fake) upload so the `mimes` rule inspects the file
     * CONTENT exactly like a production request does — Illuminate's own
     * UploadedFile::fake() derives the mime type from the file NAME instead.
     */
    private function realUpload(string $name, string $content, ?string $clientMime = null): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'kolabri-upload');
        file_put_contents($path, $content);

        return new UploadedFile($path, $name, $clientMime, null, true);
    }

    private function lecturerSession(): array
    {
        return [
            'jwt' => $this->createFakeJwt(['sub' => 'lec-1']),
            'user' => [
                'id' => 'lec-1',
                'name' => 'Dosen',
                'email' => 'lec@test.com',
                'role' => 'lecturer',
            ],
        ];
    }

    private function studentSession(): array
    {
        return [
            'jwt' => $this->createFakeJwt(['sub' => $this->studentId]),
            'user' => [
                'id' => $this->studentId,
                'name' => 'Mahasiswa',
                'email' => 'andi@student.ac.id',
                'role' => 'student',
            ],
        ];
    }

    public function test_html_payload_is_rejected_on_upload(): void
    {
        $file = $this->realUpload(
            'xss.html',
            '<html><script>alert(document.cookie)</script></html>',
            'text/html',
        );

        $response = $this->withSession($this->lecturerSession())->postJson(
            route('lecturer.courses.materials.store', ['course' => $this->courseId]),
            ['file' => $file],
        );

        $response->assertStatus(422);
        $this->assertDatabaseCount('course_materials', 0);
    }

    public function test_script_payload_with_plain_text_client_type_is_rejected(): void
    {
        // Content sniffing must win over the client's `text/plain` header:
        // the real content is HTML, so `mimes` guesses `html` → rejected.
        $file = $this->realUpload(
            'notes.txt',
            '<html><script>alert(1)</script></html>',
            'text/plain',
        );

        $this->withSession($this->lecturerSession())
            ->postJson(route('lecturer.courses.materials.store', ['course' => $this->courseId]), ['file' => $file])
            ->assertStatus(422);
    }

    public function test_pdf_upload_still_succeeds(): void
    {
        $file = $this->realUpload(
            'materi.pdf',
            "%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF\n",
            'application/pdf',
        );

        $response = $this->withSession($this->lecturerSession())->postJson(
            route('lecturer.courses.materials.store', ['course' => $this->courseId]),
            ['file' => $file],
        );

        $response->assertCreated();
        $this->assertDatabaseCount('course_materials', 1);
    }

    public function test_stream_serves_html_as_attachment_with_nosniff(): void
    {
        $path = 'materials/' . $this->courseId . '/xss.html';
        Storage::disk('private')->put($path, '<html><script>alert(1)</script></html>');

        $material = CourseMaterial::create([
            'id' => (string) Str::uuid(),
            'course_id' => $this->courseId,
            'title' => 'XSS',
            'file_name' => 'xss.html',
            'file_path' => $path,
            'file_type' => 'text/html',
            'file_size' => 30,
        ]);

        $response = $this->withSession($this->studentSession())->get(
            route('student.courses.materials.stream', [
                'course' => $this->courseId,
                'materialId' => $material->id,
            ]),
        );

        $response->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString(
            'attachment',
            (string) $response->baseResponse->headers->get('Content-Disposition'),
        );
    }

    public function test_stream_serves_pdf_inline_with_nosniff(): void
    {
        $path = 'materials/' . $this->courseId . '/materi.pdf';
        Storage::disk('private')->put($path, "%PDF-1.4\n%%EOF\n");

        $material = CourseMaterial::create([
            'id' => (string) Str::uuid(),
            'course_id' => $this->courseId,
            'title' => 'Materi',
            'file_name' => 'materi.pdf',
            'file_path' => $path,
            'file_type' => 'application/pdf',
            'file_size' => 12,
        ]);

        $response = $this->withSession($this->studentSession())->get(
            route('student.courses.materials.stream', [
                'course' => $this->courseId,
                'materialId' => $material->id,
            ]),
        );

        $response->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString(
            'inline',
            (string) $response->baseResponse->headers->get('Content-Disposition'),
        );
        $this->assertStringContainsString(
            'application/pdf',
            (string) $response->baseResponse->headers->get('Content-Type'),
        );
    }
}
