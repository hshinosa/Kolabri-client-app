<?php

namespace Tests\Feature;

use App\Models\ChatMessageAudit;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * M9 (F-07): edit / delete / audit must be bound to the message's REAL
 * conversation and to its owner — the membership guard only proves the caller
 * belongs to the conversation_id the CLIENT claims.
 */
class ChatMessageBindingTest extends TestCase
{
    private string $conversationId = '11111111-1111-4111-8111-111111111111';

    private string $messageId = '653f1c1e9a8b7c6d5e4f3a2b';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('chat_message_audit');
        Schema::create('chat_message_audit', function (Blueprint $table) {
            $table->id();
            $table->string('message_id')->index();
            $table->string('user_id')->index();
            $table->string('action');
            $table->text('old_content')->nullable();
            $table->text('new_content')->nullable();
            $table->string('conversation_id')->index();
            $table->timestamps();
        });
    }

    private function actorSession(): array
    {
        return [
            'jwt' => $this->createFakeJwt(['sub' => 'user-1']),
            'user' => [
                'id' => 'user-1',
                'name' => 'QA Student',
                'email' => 'qa@example.com',
                'role' => 'student',
            ],
        ];
    }

    /**
     * Stub core-api: the membership guard (session discussion lookup) always
     * succeeds; the message fetch returns whatever payload the test wants.
     */
    private function fakeCoreApi(array $message): void
    {
        Http::fake([
            '*/api/chat/messages/*' => Http::response(['data' => $message], 200),
            '*/api/groups/session-discussions/*' => Http::response([
                'data' => ['id' => $this->conversationId, 'groupId' => 'group-1'],
            ], 200),
            '*' => Http::response(['data' => []], 200),
        ]);
    }

    public function test_edit_rejects_a_message_from_a_different_conversation(): void
    {
        $this->fakeCoreApi([
            'id' => $this->messageId,
            'conversation_id' => '22222222-2222-4222-8222-222222222222',
            'sender_id' => 'user-1',
        ]);

        $response = $this->withSession($this->actorSession())->patchJson(
            route('chat.messages.edit', ['messageId' => $this->messageId]),
            [
                'content' => 'diedit',
                'conversation_id' => $this->conversationId,
                'old_content' => 'lama',
                'version' => 0,
            ],
        );

        $response->assertNotFound();
        $this->assertDatabaseCount('chat_message_audit', 0);
    }

    public function test_edit_rejects_a_message_the_actor_never_sent(): void
    {
        $this->fakeCoreApi([
            'id' => $this->messageId,
            'conversation_id' => $this->conversationId,
            'sender_id' => 'someone-else',
        ]);

        $response = $this->withSession($this->actorSession())->patchJson(
            route('chat.messages.edit', ['messageId' => $this->messageId]),
            [
                'content' => 'diedit',
                'conversation_id' => $this->conversationId,
                'old_content' => 'lama',
                'version' => 0,
            ],
        );

        $response->assertForbidden();
        $this->assertDatabaseCount('chat_message_audit', 0);
    }

    public function test_owner_can_edit_own_message(): void
    {
        $this->fakeCoreApi([
            'id' => $this->messageId,
            'conversation_id' => $this->conversationId,
            'sender_id' => 'user-1',
        ]);

        $response = $this->withSession($this->actorSession())->patchJson(
            route('chat.messages.edit', ['messageId' => $this->messageId]),
            [
                'content' => 'diedit',
                'conversation_id' => $this->conversationId,
                'old_content' => 'lama',
                'version' => 0,
            ],
        );

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('chat_message_audit', [
            'message_id' => $this->messageId,
            'user_id' => 'user-1',
            'action' => 'edit',
            'conversation_id' => $this->conversationId,
        ]);
    }

    public function test_delete_rejects_a_message_from_a_different_conversation(): void
    {
        $this->fakeCoreApi([
            'id' => $this->messageId,
            'conversation_id' => '22222222-2222-4222-8222-222222222222',
            'sender_id' => 'user-1',
        ]);

        $response = $this->withSession($this->actorSession())->deleteJson(
            route('chat.messages.delete', ['messageId' => $this->messageId]),
            [
                'conversation_id' => $this->conversationId,
                'content' => 'isi lama',
            ],
        );

        $response->assertNotFound();
        $this->assertDatabaseCount('chat_message_audit', 0);
    }

    public function test_audit_is_bound_to_the_message_conversation(): void
    {
        $this->fakeCoreApi([
            'id' => $this->messageId,
            'conversation_id' => '22222222-2222-4222-8222-222222222222',
            'sender_id' => 'user-1',
        ]);

        ChatMessageAudit::create([
            'message_id' => $this->messageId,
            'user_id' => 'someone-else',
            'action' => 'edit',
            'old_content' => 'lama',
            'new_content' => 'baru',
            'conversation_id' => $this->conversationId,
        ]);

        $response = $this->withSession($this->actorSession())->getJson(
            route('chat.messages.audit', ['messageId' => $this->messageId])
                . '?conversation_id=' . $this->conversationId,
        );

        $response->assertNotFound();
    }

    public function test_audit_returns_rows_when_message_matches_the_conversation(): void
    {
        $this->fakeCoreApi([
            'id' => $this->messageId,
            'conversation_id' => $this->conversationId,
            'sender_id' => 'user-1',
        ]);

        ChatMessageAudit::create([
            'message_id' => $this->messageId,
            'user_id' => 'user-1',
            'action' => 'edit',
            'old_content' => 'lama',
            'new_content' => 'baru',
            'conversation_id' => $this->conversationId,
        ]);

        $response = $this->withSession($this->actorSession())->getJson(
            route('chat.messages.audit', ['messageId' => $this->messageId])
                . '?conversation_id=' . $this->conversationId,
        );

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_message_id_is_url_encoded_when_fetching_core_api(): void
    {
        $this->fakeCoreApi([
            'id' => Str::random(8),
            'conversation_id' => $this->conversationId,
            'sender_id' => 'someone-else',
        ]);

        $this->withSession($this->actorSession())->patchJson(
            route('chat.messages.edit', ['messageId' => $this->messageId]),
            [
                'content' => 'diedit',
                'conversation_id' => $this->conversationId,
                'old_content' => 'lama',
                'version' => 0,
            ],
        )->assertForbidden();

        Http::assertSent(fn ($request) => str_contains($request->url(), '/api/chat/messages/' . $this->messageId));
    }
}
