<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\ChatMessageAudit;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
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

        // M9: bind the message to the conversation the client claims before
        // touching the audit trail (previously any member could edit/delete a
        // message that lives in a different conversation).
        $original = $this->fetchOriginalMessage($messageId, $conversationId);
        if ($original instanceof JsonResponse) {
            return $original;
        }

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

        // M9: ownership is always enforced — when no audit row exists yet the
        // owner is the original sender from the chat itself.
        $ownerId = $lastAction
            ? (string) $lastAction->user_id
            : (string) ($original['sender_id'] ?? '');

        if ($ownerId !== $userId) {
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

        // M9: same binding check as edit() — message must belong to this
        // conversation and must be resolvable upstream.
        $original = $this->fetchOriginalMessage($messageId, $conversationId);
        if ($original instanceof JsonResponse) {
            return $original;
        }

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

        // M9: owner = last known actor, or the original sender when the
        // message has never been edited.
        $ownerId = $lastAction
            ? (string) $lastAction->user_id
            : (string) ($original['sender_id'] ?? '');
        $isOwner = $ownerId === $userId;
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

        // M9: audit history is only exposed for a message that really belongs
        // to the conversation the caller claims to be in.
        $original = $this->fetchOriginalMessage($messageId, (string) $validated['conversation_id']);
        if ($original instanceof JsonResponse) {
            return $original;
        }

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
     * M9: fetch the original message from core-api and verify it belongs to the
     * conversation the client claims. Returns the message payload on success,
     * or an already-built JsonResponse (401/404/503) when the check fails.
     *
     * core-api resolves group membership from the message's REAL conversation,
     * so a message outside the caller's group is rejected upstream as well.
     */
    private function fetchOriginalMessage(string $messageId, string $conversationId): array|JsonResponse
    {
        try {
            $response = $this->apiRequest()
                ->get($this->apiUrl() . '/api/chat/messages/' . rawurlencode($messageId));
        } catch (ConnectionException|RequestException $e) {
            Log::error('fetchOriginalMessage failed', [
                'message_id' => $messageId,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Unable to verify message ownership'], 503);
        }

        if ($response->status() === 401) {
            session()->forget(['jwt', 'refresh_token', 'user']);

            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $remote = $response->json('data');

        // Unknown message, or a message in a conversation the caller is not a
        // member of — answered identically on purpose (no existence oracle).
        if (! $response->successful() || ! is_array($remote)) {
            return response()->json(['message' => 'Pesan tidak ditemukan'], 404);
        }

        if (($remote['conversation_id'] ?? null) !== $conversationId) {
            return response()->json(['message' => 'Pesan tidak ditemukan'], 404);
        }

        return $remote;
    }

    /**
     * The auth.jwt middleware exposes the authenticated session user as request
     * input 'auth_user'; it never populates Laravel's auth guard, so
     * $request->user() is null on these routes. Resolve the session user
     * explicitly and reject with 401 when it is missing.
     */
    private function resolveAuthUser(Request $request): ?array
    {
        $user = $request->input('auth_user') ?? session('user');

        return is_array($user) && isset($user['id']) ? $user : null;
    }
}
