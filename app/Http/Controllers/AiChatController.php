<?php

namespace App\Http\Controllers;

use App\Models\CourseWeek;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AiChatController extends Controller
{

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
                if ($activeChatResponse->successful()) {
                    $chatData = $activeChatResponse->json('data');
                    $activeChat = $this->normalizeChat($chatData);
                }
            }
        } catch (ConnectionException $e) {
            Log::error('Failed to fetch AI chats', ['error' => $e->getMessage()]);
            $chats = [];
            $activeChat = null;
        } catch (RequestException $e) {
            Log::error('Failed to fetch AI chats', ['error' => $e->getMessage()]);
            $chats = [];
            $activeChat = null;
        }

        if ($chatId && ! $activeChat) {
            abort(404, 'Chat not found');
        }

        // Opsi "Fokus materi" utk dropdown chat AI: minggu yang punya materi
        // di kursus yang diikuti mahasiswa (query langsung tabel course_weeks).
        $weekOptions = [];
        try {
            $enrolledResponse = $this->apiRequest()->get($this->apiUrl() . '/api/courses/enrolled');
            $enrolled = $enrolledResponse->successful() ? $enrolledResponse->json('data', []) : [];
            $courseNames = [];
            foreach ($enrolled as $course) {
                $courseNames[$course['id']] = $course['name'] ?? '';
            }
            if ($courseNames !== []) {
                $weeks = CourseWeek::whereIn('course_id', array_keys($courseNames))
                    ->withCount('weekMaterials')
                    ->orderBy('course_id')
                    ->orderBy('week_index')
                    ->get();
                foreach ($weeks as $week) {
                    if (($week->week_materials_count ?? 0) === 0) {
                        continue;
                    }
                    $weekOptions[] = [
                        'course_id' => $week->course_id,
                        'course_name' => $courseNames[$week->course_id] ?? '',
                        'week_index' => (int) $week->week_index,
                        'title' => $week->title,
                    ];
                }
            }
        } catch (ConnectionException | RequestException $e) {
            Log::warning('AiChatController: week options gagal diambil', ['error' => $e->getMessage()]);
        }

        return Inertia::render('student/ai-chat/index', [
            'chats' => $chats,
            'activeChat' => $activeChat,
            'weekOptions' => $weekOptions,
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

                if ($request->wantsJson()) {
                    return response()->json(['data' => $this->normalizeChat($chat)]);
                }

                if (!empty($validated['first_message'])) {
                    $messageResponse = $this->apiRequest()->post($this->apiUrl() . "/api/ai-chats/{$chat['id']}/messages", ['content' => $validated['first_message']]);

                    if (! $messageResponse->successful()) {
                        return redirect()->route('student.ai-chat.show', $chat['id'])
                            ->withErrors([
                                'content' => $messageResponse->json('message', 'Chat berhasil dibuat, tetapi pesan pertama gagal dikirim.'),
                            ]);
                    }

                    return redirect()->route('student.ai-chat.show', $chat['id'])
                        ->with('success', 'Chat baru dibuat dan pesan pertama berhasil dikirim!');
                }

                return redirect()->route('student.ai-chat.show', $chat['id'])
                    ->with('success', 'Chat baru berhasil dibuat!');
            }

            if ($request->wantsJson()) {
                return response()->json(['error' => $response->json('message', 'Gagal membuat chat')], 422);
            }

            return back()->withErrors(['title' => $response->json('message', 'Gagal membuat chat')]);
        } catch (ConnectionException $e) {
            Log::error('AI Chat creation failed', ['error' => $e->getMessage()]);

            if ($request->wantsJson()) {
                return response()->json(['error' => 'Tidak dapat membuat chat'], 500);
            }

            return back()->withErrors(['title' => 'Tidak dapat membuat chat']);
        } catch (RequestException $e) {
            Log::error('AI Chat creation failed', ['error' => $e->getMessage()]);

            if ($request->wantsJson()) {
                return response()->json(['error' => 'Tidak dapat membuat chat'], 500);
            }

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

    public function messages(string $chatId)
    {
        try {
            $response = $this->apiRequest()->get($this->apiUrl() . "/api/ai-chats/{$chatId}/messages");

            if ($response->successful()) {
                return response()->json([
                    'data' => $response->json('data', []),
                ]);
            }

            return response()->json([
                'error' => $response->json('error') ?? [
                    'code' => 'FETCH_MESSAGES_FAILED',
                    'message' => 'Gagal memuat pesan chat',
                ],
            ], $response->status());
        } catch (ConnectionException $e) {
            Log::error('Fetch AI chat messages failed', ['error' => $e->getMessage(), 'chat_id' => $chatId]);

            return response()->json([
                'error' => [
                    'code' => 'FETCH_MESSAGES_FAILED',
                    'message' => 'Tidak dapat memuat pesan chat',
                ],
            ], 500);
        } catch (RequestException $e) {
            Log::error('Fetch AI chat messages failed', ['error' => $e->getMessage(), 'chat_id' => $chatId]);

            return response()->json([
                'error' => [
                    'code' => 'FETCH_MESSAGES_FAILED',
                    'message' => 'Tidak dapat memuat pesan chat',
                ],
            ], 500);
        }
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
            $response = $this->apiRequest()->post($this->apiUrl() . "/api/ai-chats/{$chatId}/messages", ['content' => $validated['content']]);

            if ($response->successful()) {
                return back();
            }

            return back()->withErrors(['content' => $response->json('message', 'Gagal mengirim pesan')]);
        } catch (ConnectionException $e) {
            Log::error('Send AI message failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['content' => 'Tidak dapat mengirim pesan']);
        } catch (RequestException $e) {
            Log::error('Send AI message failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['content' => 'Tidak dapat mengirim pesan']);
        }
    }

    public function streamMessage(Request $request, string $chatId)
    {
        $content = $request->input('content', '');
        if (empty($content)) {
            return response()->json(['error' => 'Content is required'], 422);
        }
        $weekIndex = $request->input('week_index');
        $focusCourseId = $request->input('focus_course_id');

        $jwt = session('jwt');
        if (empty($jwt)) {
            return response()->json(['error' => 'Not authenticated'], 401);
        }

        return response()->stream(function () use ($content, $chatId, $jwt, $weekIndex, $focusCourseId) {
            while (ob_get_level() > 0) {
                ob_end_flush();
            }

            $url = $this->apiUrl() . "/api/ai-chats/{$chatId}/messages/stream";

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode(array_filter([
                    'content' => $content,
                    'week_index' => is_numeric($weekIndex) ? (int) $weekIndex : null,
                    'focus_course_id' => $focusCourseId ?: null,
                ], static fn ($v) => $v !== null)),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $jwt,
                    'Accept: text/event-stream',
                ],
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_WRITEFUNCTION => function ($curlHandle, $data) {
                    if (! $curlHandle) {
                        return 0;
                    }

                    echo $data;
                    flush();
                    return strlen($data);
                },
                CURLOPT_TIMEOUT => 120,
                CURLOPT_CONNECTTIMEOUT => 10,
            ]);

            $result = curl_exec($ch);

            if ($result === false) {
                $error = curl_error($ch);
                $errno = curl_errno($ch);
                Log::error('Stream proxy cURL failed', [
                    'error' => $error, 
                    'errno' => $errno, 
                    'url' => $url,
                ]);
                echo "data: " . json_encode(['type' => 'error', 'content' => 'Stream connection failed: ' . $error]) . "\n\n";
                flush();
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
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
            $response = $this->apiRequest()->patch($this->apiUrl() . "/api/ai-chats/{$chatId}", ['title' => $validated['title']]);

            if ($response->successful()) {
                return back()->with('success', 'Judul chat diperbarui!');
            }

            return back()->withErrors(['title' => $response->json('message', 'Gagal memperbarui judul')]);
        } catch (ConnectionException $e) {
            Log::error('Update AI chat failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['title' => 'Tidak dapat memperbarui chat']);
        } catch (RequestException $e) {
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
        } catch (ConnectionException $e) {
            Log::error('Delete AI chat failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['chat' => 'Tidak dapat menghapus chat']);
        } catch (RequestException $e) {
            Log::error('Delete AI chat failed', ['error' => $e->getMessage()]);
            return back()->withErrors(['chat' => 'Tidak dapat menghapus chat']);
        }
    }
}
