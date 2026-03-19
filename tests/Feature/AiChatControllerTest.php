<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiChatControllerTest extends TestCase
{
    public function test_show_returns_404_when_chat_is_not_found(): void
    {
        Http::fake([
            'http://localhost:3000/api/ai-chats' => Http::response([
                'data' => [],
            ], 200),
            'http://localhost:3000/api/ai-chats/chat-missing' => Http::response([
                'message' => 'Chat not found',
            ], 404),
        ]);

        $response = $this
            ->withSession([
                'jwt' => 'token-uji',
                'user' => [
                    'id' => 'user-1',
                    'name' => 'QA Student',
                    'email' => 'qa@example.com',
                    'role' => 'student',
                ],
            ])
            ->get(route('student.ai-chat.show', 'chat-missing'));

        $response->assertNotFound();
    }

    public function test_show_normalizes_chat_and_message_timestamps_to_snake_case(): void
    {
        Http::fake([
            'http://localhost:3000/api/ai-chats' => Http::response([
                'data' => [
                    [
                        'id' => 'chat-123',
                        'title' => 'Chat Satu',
                        'createdAt' => '2026-03-19T10:00:00.000Z',
                        'updatedAt' => '2026-03-19T10:05:00.000Z',
                    ],
                ],
            ], 200),
            'http://localhost:3000/api/ai-chats/chat-123' => Http::response([
                'data' => [
                    'id' => 'chat-123',
                    'title' => 'Chat Satu',
                    'createdAt' => '2026-03-19T10:00:00.000Z',
                    'updatedAt' => '2026-03-19T10:05:00.000Z',
                    'messages' => [
                        [
                            'id' => 'msg-1',
                            'role' => 'assistant',
                            'content' => 'Halo',
                            'createdAt' => '2026-03-19T10:05:00.000Z',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this
            ->withSession([
                'jwt' => 'token-uji',
                'user' => [
                    'id' => 'user-1',
                    'name' => 'QA Student',
                    'email' => 'qa@example.com',
                    'role' => 'student',
                ],
            ])
            ->get(route('student.ai-chat.show', 'chat-123'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('student/ai-chat/index')
            ->where('chats.0.created_at', '2026-03-19T10:00:00.000Z')
            ->where('chats.0.updated_at', '2026-03-19T10:05:00.000Z')
            ->where('activeChat.created_at', '2026-03-19T10:00:00.000Z')
            ->where('activeChat.updated_at', '2026-03-19T10:05:00.000Z')
            ->where('activeChat.messages.0.created_at', '2026-03-19T10:05:00.000Z')
        );
    }

    public function test_store_creates_chat_and_sends_first_message_when_provided(): void
    {
        Http::fake([
            'http://localhost:3000/api/ai-chats' => Http::response([
                'data' => [
                    'id' => 'chat-123',
                    'title' => 'Pesan pertama yang panjang',
                ],
            ], 200),
            'http://localhost:3000/api/ai-chats/chat-123/messages' => Http::response([
                'data' => [
                    'id' => 'msg-123',
                    'content' => 'Pesan pertama yang panjang',
                ],
            ], 200),
        ]);

        $response = $this
            ->withSession([
                'jwt' => 'token-uji',
                'user' => [
                    'id' => 'user-1',
                    'name' => 'QA Student',
                    'email' => 'qa@example.com',
                    'role' => 'student',
                ],
            ])
            ->post(route('student.ai-chat.store'), [
                'title' => 'Pesan pertama yang panjang',
                'first_message' => 'Pesan pertama yang panjang',
            ]);

        $response->assertRedirect(route('student.ai-chat.show', 'chat-123'));
        $response->assertSessionHas('success', 'Chat baru dibuat dan pesan pertama berhasil dikirim!');

        Http::assertSentCount(2);

        Http::assertSent(function ($request) {
            return $request->url() === 'http://localhost:3000/api/ai-chats'
                && $request->method() === 'POST'
                && $request['title'] === 'Pesan pertama yang panjang'
                && $request->hasHeader('Authorization', 'Bearer token-uji');
        });

        Http::assertSent(function ($request) {
            return $request->url() === 'http://localhost:3000/api/ai-chats/chat-123/messages'
                && $request->method() === 'POST'
                && $request['content'] === 'Pesan pertama yang panjang'
                && $request->hasHeader('Authorization', 'Bearer token-uji');
        });
    }

    public function test_update_renames_chat_title(): void
    {
        Http::fake([
            'http://localhost:3000/api/ai-chats/chat-123' => Http::response([
                'data' => [
                    'id' => 'chat-123',
                    'title' => 'Judul Baru',
                    'updatedAt' => '2026-03-19T10:10:00.000Z',
                ],
            ], 200),
        ]);

        $response = $this
            ->withSession([
                'jwt' => 'token-uji',
                'user' => [
                    'id' => 'user-1',
                    'name' => 'QA Student',
                    'email' => 'qa@example.com',
                    'role' => 'student',
                ],
            ])
            ->patch(route('student.ai-chat.update', 'chat-123'), [
                'title' => 'Judul Baru',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Judul chat diperbarui!');

        Http::assertSent(function ($request) {
            return $request->url() === 'http://localhost:3000/api/ai-chats/chat-123'
                && $request->method() === 'PATCH'
                && $request['title'] === 'Judul Baru'
                && $request->hasHeader('Authorization', 'Bearer token-uji');
        });
    }
}
