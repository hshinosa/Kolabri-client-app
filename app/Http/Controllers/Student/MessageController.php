<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\ChatMessageAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MessageController extends Controller
{
    public function edit(Request $request, string $messageId): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string|max:5000',
            'conversation_id' => 'required|string',
            'old_content' => 'required|string',
            'version' => 'sometimes|integer|min:0',
        ]);

        $authUser = $this->resolveAuthUser($request);
        if ($authUser === null) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $userId = (string) $authUser['id'];
        $conversationId = $validated['conversation_id'];
        $newContent = $validated['content'];
        $oldContent = $validated['old_content'];
        $clientVersion = $validated['version'] ?? 0;

        $lastAction = ChatMessageAudit::forMessage($messageId)
            ->where('conversation_id', $conversationId)
            ->orderByDesc('created_at')
            ->first();

        if ($lastAction && $lastAction->action === 'delete') {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat mengedit pesan yang sudah dihapus',
            ], 422);
        }

        if ($lastAction && $lastAction->user_id !== $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Anda hanya bisa mengedit pesan sendiri',
            ], 403);
        }

        $createdAt = $lastAction ? $lastAction->created_at : null;
        if ($createdAt && $createdAt->diffInHours(now()) > 24) {
            return response()->json([
                'success' => false,
                'message' => 'Pesan hanya bisa diedit dalam 24 jam pertama',
            ], 422);
        }

        $editCount = ChatMessageAudit::forMessage($messageId)
            ->where('conversation_id', $conversationId)
            ->where('action', 'edit')
            ->count();
        $currentVersion = $editCount;

        if ($clientVersion !== $currentVersion) {
            return response()->json([
                'success' => false,
                'message' => 'Konflik versi: pesan telah diedit oleh pihak lain',
                'current_version' => $currentVersion,
            ], 409);
        }

        ChatMessageAudit::create([
            'message_id' => $messageId,
            'user_id' => $userId,
            'action' => 'edit',
            'old_content' => $oldContent,
            'new_content' => $newContent,
            'conversation_id' => $conversationId,
        ]);

        Log::info('Message edited', [
            'message_id' => $messageId,
            'user_id' => $userId,
            'conversation_id' => $conversationId,
            'version' => $currentVersion + 1,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pesan berhasil diedit',
            'data' => [
                'message_id' => $messageId,
                'edited_at' => now()->toISOString(),
                'version' => $currentVersion + 1,
            ],
        ]);
    }

    public function destroy(Request $request, string $messageId): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => 'required|string',
            'content' => 'required|string',
        ]);

        $authUser = $this->resolveAuthUser($request);
        if ($authUser === null) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $userId = (string) $authUser['id'];
        $conversationId = $validated['conversation_id'];
        $content = $validated['content'];

        $lastAction = ChatMessageAudit::forMessage($messageId)
            ->where('conversation_id', $conversationId)
            ->orderByDesc('created_at')
            ->first();

        if ($lastAction && $lastAction->action === 'delete') {
            return response()->json([
                'success' => false,
                'message' => 'Pesan sudah dihapus',
            ], 422);
        }

        $isOwner = !$lastAction || $lastAction->user_id === $userId;
        $isModerator = in_array((string) ($authUser['role'] ?? ''), ['moderator', 'admin', 'teacher'], true);

        if (!$isOwner && !$isModerator) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk menghapus pesan ini',
            ], 403);
        }

        ChatMessageAudit::create([
            'message_id' => $messageId,
            'user_id' => $userId,
            'action' => 'delete',
            'old_content' => $content,
            'new_content' => null,
            'conversation_id' => $conversationId,
        ]);

        Log::info('Message deleted', [
            'message_id' => $messageId,
            'user_id' => $userId,
            'conversation_id' => $conversationId,
            'is_moderator_delete' => !$isOwner,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pesan berhasil dihapus',
            'data' => [
                'message_id' => $messageId,
                'deleted_at' => now()->toISOString(),
            ],
        ]);
    }

    public function audit(Request $request, string $messageId): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => 'required|string',
        ]);

        $audits = ChatMessageAudit::forMessage($messageId)
            ->where('conversation_id', $validated['conversation_id'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $audits,
        ]);
    }

    /**
     * The auth.jwt middleware exposes the authenticated session user as request
     * input 'auth_user'; it never populates Laravel's auth guard, so
     * $request->user() is null on these routes. Resolve the session user
     * explicitly and reject with401 when it is missing.
     */
    private function resolveAuthUser(Request $request): ?array
    {
        $user = $request->input('auth_user') ?? session('user');

        return is_array($user) && isset($user['id']) ? $user : null;
    }
}
