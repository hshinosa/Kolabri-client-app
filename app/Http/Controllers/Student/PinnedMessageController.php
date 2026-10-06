<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\PinnedMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PinnedMessageController extends Controller
{
    private const MAX_PINS_PER_ROOM = 10;

    public function store(Request $request, string $messageId): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => 'required|string',
            'content' => 'required|string',
            'sender_name' => 'required|string',
        ]);

        $authUser = $this->resolveAuthUser($request);
        if ($authUser === null) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $userId = (string) $authUser['id'];
        $conversationId = $validated['conversation_id'];

        // Semua anggota yang terautentikasi (termasuk mahasiswa) boleh menyematkan
        // pesan — konsisten dengan destroy() yang tidak membatasi role apa pun.
        // Batas maksimal tetap berlaku.

        $currentPinCount = PinnedMessage::forConversation($conversationId)->count();
        if ($currentPinCount >= self::MAX_PINS_PER_ROOM) {
            return response()->json([
                'success' => false,
                'message' => 'Maksimal ' . self::MAX_PINS_PER_ROOM . ' pesan dapat disematkan',
            ], 422);
        }

        $existing = PinnedMessage::where('message_id', $messageId)
            ->where('conversation_id', $conversationId)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Pesan sudah disematkan',
            ], 422);
        }

        $pinned = PinnedMessage::create([
            'message_id' => $messageId,
            'conversation_id' => $conversationId,
            'pinned_by' => $userId,
            'content' => $validated['content'],
            'sender_name' => $validated['sender_name'],
            'pinned_at' => now(),
        ]);

        Log::info('Message pinned', [
            'message_id' => $messageId,
            'conversation_id' => $conversationId,
            'pinned_by' => $userId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pesan berhasil disematkan',
            'data' => $pinned,
        ]);
    }

    public function destroy(Request $request, string $messageId): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => 'required|string',
        ]);

        $conversationId = $validated['conversation_id'];
        $authUser = $this->resolveAuthUser($request);
        if ($authUser === null) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $userId = (string) $authUser['id'];

        $pinned = PinnedMessage::where('message_id', $messageId)
            ->where('conversation_id', $conversationId)
            ->first();

        if (!$pinned) {
            return response()->json([
                'success' => false,
                'message' => 'Pesan tidak ditemukan di daftar sematan',
            ], 404);
        }

        $pinned->delete();

        Log::info('Message unpinned', [
            'message_id' => $messageId,
            'conversation_id' => $conversationId,
            'unpinned_by' => $userId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sematan pesan berhasil dihapus',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => 'required|string',
        ]);

        $pinned = PinnedMessage::forConversation($validated['conversation_id'])
            ->orderByDesc('pinned_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $pinned,
        ]);
    }


    /**
     * auth.jwt exposes the session user as request input 'auth_user' and never
     * populates Laravel's auth guard, so $request->user() is null here.
     */
    private function resolveAuthUser(Request $request): ?array
    {
        $user = $request->input('auth_user') ?? session('user');

        return is_array($user) && isset($user['id']) ? $user : null;
    }

}
