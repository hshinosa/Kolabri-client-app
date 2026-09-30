<?php

namespace Tests;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Feature tests without RefreshDatabase boot an empty sqlite; the
        // assert.enrolled guard queries course_students either way.
        if (! Schema::hasTable('course_students')) {
            Schema::create('course_students', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('course_id')->index();
                $table->string('user_id')->index();
                $table->timestamp('enrolled_at')->useCurrent();
            });
        }

        // The users table belongs to core-api in production (its migration
        // skips creation on purpose); tests need a minimal stand-in for
        // App\Models\User. password is nullable so mass-assignment tests can
        // assert it stays unset.
        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password')->nullable();
                $table->string('remember_token', 100)->nullable();
                $table->timestamps();
            });
        }
    }

    protected function createFakeJwt(array $payload = []): string
    {
        $header = base64_encode(json_encode(['alg' => 'none', 'typ' => 'JWT']));
        $defaultPayload = [
            'sub' => 'user-1',
            'exp' => time() + 3600,
            'iat' => time(),
        ];
        $body = base64_encode(json_encode(array_merge($defaultPayload, $payload)));
        $signature = base64_encode('fake-signature');

        return "{$header}.{$body}.{$signature}";
    }

    protected function studentSessionData(?string $userId = 'user-1'): array
    {
        return [
            'jwt' => $this->createFakeJwt(['sub' => $userId]),
            'user' => [
                'id' => $userId,
                'name' => 'QA Student',
                'email' => 'qa@example.com',
                'role' => 'student',
            ],
        ];
    }

    /**
     * Seed a course_students row so the assert.enrolled middleware lets the
     * session user into course-scoped student routes.
     */
    protected function enrollStudent(string $userId, string $courseId): void
    {
        \App\Models\CourseStudent::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'course_id' => $courseId,
            'user_id' => $userId,
            'enrolled_at' => now(),
        ]);
    }
}
