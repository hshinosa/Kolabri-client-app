<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GroupSessionDiscussionWeekBindingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
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
    }

    private function studentSession(): self
    {
        return $this->withSession($this->studentSessionData('11111111-1111-1111-1111-111111111111'));
    }

    public function test_store_session_discussion_fails_validation_without_week_id(): void
    {
        Http::fake();

        $response = $this->studentSession()
            ->from(route('student.groups.index', 'course-1'))
            ->post(route('student.groups.session-discussions.store', 'group-1'), [
                'name' => 'Diskusi A',
            ]);

        $response->assertSessionHasErrors('week_id');
        Http::assertNothingSent();
    }

    public function test_store_session_discussion_proxies_week_id_to_core_api(): void
    {
        $weekId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

        Http::fake([
            'http://localhost:3000/api/groups/group-1/session-discussions' => Http::response([
                'data' => [
                    'id' => 'chat-1',
                    'name' => 'Diskusi A',
                    'weekId' => $weekId,
                ],
            ], 201),
        ]);

        $response = $this->studentSession()
            ->from(route('student.groups.index', 'course-1'))
            ->post(route('student.groups.session-discussions.store', 'group-1'), [
                'name' => 'Diskusi A',
                'week_id' => $weekId,
            ]);

        $response->assertRedirect(route('student.groups.index', 'course-1'));
        $response->assertSessionHas('success', 'Ruang chat berhasil dibuat!');

        Http::assertSent(function ($request) use ($weekId) {
            return $request->url() === 'http://localhost:3000/api/groups/group-1/session-discussions'
                && $request['name'] === 'Diskusi A'
                && $request['week_id'] === $weekId;
        });
    }
}