<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AiChatController extends Controller
{
    protected function apiUrl(): string
    {
        return config('services.api.base_url', 'http://localhost:3000');
    }

    protected function apiRequest()
    {
        return Http::withToken(session('jwt'));
    }

    protected function normalizeChat(array $chat): array
    {
        return [
            ...$chat,
            'created_at' => $chat['created_at'] ?? $chat['createdAt'] ?? null,
            'updated_at' => $chat['updated_at'] ?? $chat['updatedAt'] ?? null,
            'messages' => isset($chat['messages']) && is_array($chat['messages'])
                ? array_map(fn (array $message) => [
                    ...$message,
                    'created_at' => $message['created_at'] ?? $message['createdAt'] ?? null,
                ], $chat['messages'])
                : ($chat['messages'] ?? null),
        ];
    }

    /**
     * AI Chat Index - Shows chat list and active chat
     */
    public function index(?string $chatId = null): Response
    {
        try {
            $chatsResponse = $this->apiRequest()->get($this->apiUrl() . '/api/ai-chats');
            $chats = $chatsResponse->successful()
                ? array_map(fn (array $chat) => $this->normalizeChat($chat), $chatsResponse->json('data', []))
                : [];

            $activeChat = null;
            if ($chatId) {
                $activeChatResponse = $this->apiRequest()->get($this->apiUrl() . "/api/ai-chats/{$chatId}");
                $activeChat = $activeChatResponse->successful()
                    ? $this->normalizeChat($activeChatResponse->json('data'))
                    : null;
            }
        } catch (\Exception $e) {
            Log::error('Failed to fetch AI chats', ['error' => $e->getMessage()]);
            $chats = [];
            $activeChat = null;
        }

        if ($chatId && ! $activeChat) {
            abort(404, 'Chat not found');
        }

        return Inertia::render('student/ai-chat/index', [
            'chats' => $chats,
            'activeChat' => $activeChat,
        ]);
    }

    /**
     * Create New Chat
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:100',
            'first_message' => 'nullable|string|max:10000',
        ]);

        try {
            $response = $this->apiRequest()->post($this->apiUrl() . '/api/ai-chats', [
                'title' => $validated['title'] ?? null,
            ]);

            if ($response->successful()) {
                $chat = $response->json('data');

                if (!empty($validated['first_message'])) {
                    $messageResponse = $this->apiRequest()->post(
                        $this->apiUrl() . "/api/ai-chats/{$chat['id']}/messages",
                        ['content' => $validated['first_message']]
                    );

                    if (! $messageResponse->successful()) {
                        return redirect()->route('student.ai-chat.show', $chat['id'])
                            ->withErrors([
                                'content' => $messageResponse->json('message', 'Chat berhasil dibuat, tetapi pesan pertama gagal dikirim.'),
                            ]);
                    }
                }

                return redirect()->route('student.ai-chat.show', $chat['id'])
                    ->with('success', !empty($validated['first_message']) ? 'Chat baru dibuat dan pesan pertama berhasil dikirim!' : 'Chat baru dibuat!');
            }

            return back()->withErrors(['title' => $response->json('message', 'Gagal membuat chat')]);
        } catch (\Exception $e) {
            Log::error('AI Chat creation failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['title' => 'Tidak dapat membuat chat']);
        }
    }

    /**
     * Show specific chat
     */
    public function show(string $chatId): Response
    {
        return $this->index($chatId);
    }

    /**
     * Send message to AI
     */
    public function sendMessage(Request $request, string $chatId)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:10000',
        ]);

        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . "/api/ai-chats/{$chatId}/messages",
                ['content' => $validated['content']]
            );

            if ($response->successful()) {
                return back();
            }

            return back()->withErrors(['content' => $response->json('message', 'Gagal mengirim pesan')]);
        } catch (\Exception $e) {
            Log::error('Send AI message failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['content' => 'Tidak dapat mengirim pesan']);
        }
    }

    /**
     * Update chat title
     */
    public function update(Request $request, string $chatId)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
        ]);

        try {
            $response = $this->apiRequest()->patch(
                $this->apiUrl() . "/api/ai-chats/{$chatId}",
                ['title' => $validated['title']]
            );

            if ($response->successful()) {
                return back()->with('success', 'Judul chat diperbarui!');
            }

            return back()->withErrors(['title' => $response->json('message', 'Gagal memperbarui judul')]);
        } catch (\Exception $e) {
            Log::error('Update AI chat failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['title' => 'Tidak dapat memperbarui chat']);
        }
    }

    /**
     * Delete chat
     */
    public function destroy(string $chatId)
    {
        try {
            $response = $this->apiRequest()->delete($this->apiUrl() . "/api/ai-chats/{$chatId}");

            if ($response->successful()) {
                return redirect()->route('student.ai-chat.index')
                    ->with('success', 'Chat dihapus!');
            }

            return back()->withErrors(['chat' => $response->json('message', 'Gagal menghapus chat')]);
        } catch (\Exception $e) {
            Log::error('Delete AI chat failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['chat' => 'Tidak dapat menghapus chat']);
        }
    }
}
