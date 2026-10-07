import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { refreshAuthToken } from '@/lib/getAuthToken';
import { resolveSocketUrl } from '@/lib/socket-url';
import type {
    ChatDisplayMessage as DisplayMessage,
    ChatSocketMessage as SocketChatMessage,
} from '@/types/chat';
import { mapSocketToDisplayMessage } from '@/hooks/mapSocketDisplayMessage';

export type { SocketChatMessage };

interface OnlineUser {
    odId: string;
    userName: string;
}

interface DiscussionQuality {
    qualityScore: number;
    engagementTypes: Record<string, number>;
    hotPercentage: number;
    lastMessage?: string;
}

interface UseSocketRoomOptions {
    jwtToken: string;
    courseId: string;
    groupId: string;
    sessionDiscussionId: string;
    socketUrl?: string;
    onSessionClosed?: (payload: { closedAt?: string; message?: string }) => void;
    onSessionReopened?: () => void;
    onMessagesLoaded?: (messages: DisplayMessage[]) => void;
    onMessagesPageLoaded?: (messages: DisplayMessage[], hasMore: boolean) => void;
    onMessageReceived?: (message: DisplayMessage, raw: SocketChatMessage) => void;
    onMessageDeleted?: (messageId: string) => void;
    onMessageEdited?: (messageId: string, newContent: string, editedAt: string) => void;
    onMessagePinned?: (pinnedMessage: { messageId: string; conversationId: string; content: string; sender_name: string; pinned_at: string }) => void;
    onMessageUnpinned?: (messageId: string) => void;
    onMessageClassified?: (classifications: Array<{ messageId: string; isRelevant: boolean }>) => void;
    onAIChunk?: (data: { sessionDiscussionId: string; content?: string; replace?: boolean; timestamp: string }) => void;
    onAIDone?: (data: { sessionDiscussionId: string; citations?: unknown; error?: boolean; timestamp: string }) => void;
}

interface UseSocketRoomReturn {
    socketRef: React.RefObject<Socket | null>;
    isConnected: boolean;
    connectionError: string | null;
    connectionStatus: 'connecting' | 'reconnecting' | 'disconnected' | 'connected';
    typingUsers: string[];
    onlineUsers: OnlineUser[];
    discussionQuality: DiscussionQuality | null;
    showQualityFeedback: boolean;
    hasMoreMessages: boolean;
    loadMoreMessages: (sessionDiscussionId: string, beforeMessageId: string) => void;
    emitEditMessage: (messageId: string, content: string) => void;
    emitDeleteMessage: (messageId: string) => void;
    emitPinMessage: (messageId: string, content: string, senderName: string) => void;
    emitUnpinMessage: (messageId: string) => void;
}

export function useSocketRoom({
    jwtToken,
    courseId,
    groupId,
    sessionDiscussionId,
    socketUrl,
    onSessionClosed,
    onSessionReopened,
    onMessagesLoaded,
    onMessagesPageLoaded,
    onMessageReceived,
    onMessageDeleted,
    onMessageEdited,
    onMessagePinned,
    onMessageUnpinned,
    onMessageClassified,
    onAIChunk,
    onAIDone,
}: UseSocketRoomOptions): UseSocketRoomReturn {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'reconnecting' | 'disconnected' | 'connected'>('connecting');
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [discussionQuality, setDiscussionQuality] = useState<DiscussionQuality | null>(null);
    const [showQualityFeedback, setShowQualityFeedback] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const qualityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onSessionClosedRef = useRef(onSessionClosed);
    const onSessionReopenedRef = useRef(onSessionReopened);
    const onMessagesLoadedRef = useRef(onMessagesLoaded);
    const onMessagesPageLoadedRef = useRef(onMessagesPageLoaded);
    const onMessageReceivedRef = useRef(onMessageReceived);
    const onMessageDeletedRef = useRef(onMessageDeleted);
    const onMessageEditedRef = useRef(onMessageEdited);
    const onMessagePinnedRef = useRef(onMessagePinned);
    const onMessageUnpinnedRef = useRef(onMessageUnpinned);
    const onMessageClassifiedRef = useRef(onMessageClassified);
    const onAIChunkRef = useRef(onAIChunk);
    const onAIDoneRef = useRef(onAIDone);

    onSessionClosedRef.current = onSessionClosed;
    onSessionReopenedRef.current = onSessionReopened;
    onMessagesLoadedRef.current = onMessagesLoaded;
    onMessagesPageLoadedRef.current = onMessagesPageLoaded;
    onMessageReceivedRef.current = onMessageReceived;
    onMessageDeletedRef.current = onMessageDeleted;
    onMessageEditedRef.current = onMessageEdited;
    onMessagePinnedRef.current = onMessagePinned;
    onMessageUnpinnedRef.current = onMessageUnpinned;
    onMessageClassifiedRef.current = onMessageClassified;
    onAIChunkRef.current = onAIChunk;
    onAIDoneRef.current = onAIDone;

    useEffect(() => {
        if (!jwtToken) return;
        if (!courseId || !groupId || !sessionDiscussionId) {
            setConnectionError('Informasi mata kuliah, grup, atau sesi diskusi tidak lengkap');
            return;
        }

        const apiUrl = resolveSocketUrl(socketUrl);

        socketRef.current = io(apiUrl, {
            auth: { token: jwtToken },
            transports: ['polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
            randomizationFactor: 0.5,
        });

        const handleVisibilityChange = () => {
            if (!socketRef.current) {
                return;
            }

            if (document.hidden) {
                setConnectionStatus('disconnected');
                setIsConnected(false);
                socketRef.current.disconnect();
                return;
            }

            if (!socketRef.current.connected) {
                setConnectionStatus('reconnecting');
                socketRef.current.connect();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        socketRef.current.on('connect', () => {
            setConnectionError(null);
            setIsConnected(true);
            setConnectionStatus('connected');
            socketRef.current?.emit('join_room', { courseId, groupId, sessionDiscussionId });
            setTypingUsers([]);
        });

        socketRef.current.on('reconnect_attempt', () => {
            setConnectionStatus('reconnecting');
        });

        socketRef.current.on('reconnect', () => {
            setIsConnected(true);
            setConnectionStatus('connected');
        });

        socketRef.current.on('reconnect_failed', () => {
            setConnectionStatus('disconnected');
        });

        let reauthAttempted = false;
        socketRef.current.on('connect_error', async (error) => {
            if (socketRef.current?.connected) {
                return;
            }

            const msg = (error?.message || '').toLowerCase();
            const isAuthError = msg.includes('unauthorized') || msg.includes('expired') || msg.includes('token') || msg.includes('auth');

            if (isAuthError && !reauthAttempted) {
                reauthAttempted = true;
                try {
                    const newToken = await refreshAuthToken();
                    if (newToken && socketRef.current) {
                        socketRef.current.auth = { token: newToken };
                        socketRef.current.connect();
                    } else {
                        setConnectionError('Session expired. Please refresh the page.');
                        setIsConnected(false);
                    }
                    return;
                } catch {
                    setConnectionError('Authentication failed. Please refresh the page.');
                    setIsConnected(false);
                    return;
                }
            }

            setConnectionError(`Connection failed: ${error.message}`);
            setIsConnected(false);
        });

        socketRef.current.on('room_joined', () => {
            setIsConnected(true);
            setConnectionError(null);
        });

        socketRef.current.on('chat_history', (data: { messages: SocketChatMessage[] }) => {
            const historyMessages: DisplayMessage[] = data.messages.map(mapSocketToDisplayMessage);
            onMessagesLoadedRef.current?.(historyMessages);
        });

        socketRef.current.on('chat_history_page', (data: { messages: SocketChatMessage[]; hasMore: boolean }) => {
            const pageMessages: DisplayMessage[] = data.messages.map(mapSocketToDisplayMessage);
            setHasMoreMessages(data.hasMore);
            onMessagesPageLoadedRef.current?.(pageMessages, data.hasMore);
        });

        socketRef.current.on('disconnect', () => {
            setIsConnected(false);
            setConnectionStatus('disconnected');
        });

        socketRef.current.on('server_error', (data: { message: string }) => {
            setConnectionError(data.message);
            setIsConnected(false);
        });

        // Rate limit server (mis. >10 pesan/10 detik): tanpa handler ini pesan
        // yang dibatasi hilang senyap tanpa kabar ke pengguna (bug E2E 2026-10-06).
        socketRef.current.on(
            'rate_limit_exceeded',
            (data: { message?: string; retryAfter?: number }) => {
                const wait = data.retryAfter
                    ? ` Coba lagi dalam ${Math.ceil(data.retryAfter / 1000)} detik.`
                    : '';
                setConnectionError((data.message || 'Terlalu banyak permintaan.') + wait);
            },
        );

        socketRef.current.on('intervention_error', (data: { message?: string }) => {
            setConnectionError(data.message || 'AI intervention unavailable right now.');
        });

        socketRef.current.on('session_closed', (payload: { closedAt?: string; message?: string }) => {
            onSessionClosedRef.current?.(payload);
        });

        socketRef.current.on('session_reopened', () => {
            onSessionReopenedRef.current?.();
        });

        socketRef.current.on('receive_message', (message: SocketChatMessage) => {
            const displayMessage = mapSocketToDisplayMessage(message);
            onMessageReceivedRef.current?.(displayMessage, message);
        });

        socketRef.current.on('message_deleted', (data: { messageId: string }) => {
            onMessageDeletedRef.current?.(data.messageId);
        });

        socketRef.current.on('message_edited', (data: { messageId: string; content: string; editedAt: string }) => {
            onMessageEditedRef.current?.(data.messageId, data.content, data.editedAt);
        });

        socketRef.current.on('message_pinned', (data: { messageId: string; conversationId: string; content: string; sender_name: string; pinned_at: string }) => {
            onMessagePinnedRef.current?.(data);
        });

        socketRef.current.on('message_unpinned', (data: { messageId: string }) => {
            onMessageUnpinnedRef.current?.(data.messageId);
        });

        socketRef.current.on('message_classified', (data: { classifications: Array<{ messageId: string; isRelevant: boolean }> }) => {
            onMessageClassifiedRef.current?.(data.classifications);
        });

        socketRef.current.on('user_typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
            setTypingUsers((prev) => {
                if (data.isTyping) {
                    return prev.includes(data.userName) ? prev : [...prev, data.userName];
                }
                return prev.filter((name) => name !== data.userName);
            });
        });

        socketRef.current.on('online_users', (data: { users: Array<{ userId: string; userName: string }> }) => {
            setOnlineUsers((data.users || []).map((u) => ({ odId: u.userId, userName: u.userName })));
        });

        socketRef.current.on('user_joined', (data: { userId: string; userName: string }) => {
            setOnlineUsers((prev) => {
                if (prev.some((u) => u.odId === data.userId)) return prev;
                return [...prev, { odId: data.userId, userName: data.userName }];
            });
        });

        socketRef.current.on('user_left', (data: { userId: string }) => {
            setOnlineUsers((prev) => prev.filter((u) => u.odId !== data.userId));
        });

        socketRef.current.on('quality_update', (data: {
            qualityScore: number;
            engagementTypes: Record<string, number>;
            hotPercentage: number;
            message?: string;
        }) => {
            setDiscussionQuality({
                qualityScore: data.qualityScore,
                engagementTypes: data.engagementTypes,
                hotPercentage: data.hotPercentage,
                lastMessage: data.message,
            });
            setShowQualityFeedback(true);
            if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
            qualityTimerRef.current = setTimeout(() => {
                setShowQualityFeedback(false);
                qualityTimerRef.current = null;
            }, 5000);
        });

        // PERF-AI-01: Streaming AI response chunks
        socketRef.current.on('ai_chunk', (data: { sessionDiscussionId: string; content?: string; replace?: boolean; timestamp: string }) => {
            onAIChunkRef.current?.(data);
        });

        socketRef.current.on('ai_done', (data: { sessionDiscussionId: string; citations?: unknown; error?: boolean; timestamp: string }) => {
            onAIDoneRef.current?.(data);
        });

        socketRef.current.on('intervention_sent', (data: { message: string; triggerReason: string }) => {
            void data.triggerReason;
        });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (qualityTimerRef.current) {
                clearTimeout(qualityTimerRef.current);
                qualityTimerRef.current = null;
            }
            socketRef.current?.off('session_closed');
            socketRef.current?.off('session_reopened');
            socketRef.current?.off('quality_update');
            socketRef.current?.off('intervention_sent');
            socketRef.current?.off('reconnect_attempt');
            socketRef.current?.off('reconnect');
            socketRef.current?.off('reconnect_failed');
            socketRef.current?.off('chat_history_page');
            socketRef.current?.off('message_edited');
            socketRef.current?.off('message_pinned');
            socketRef.current?.off('message_unpinned');
            socketRef.current?.off('message_classified');
            socketRef.current?.off('ai_chunk');
            socketRef.current?.off('ai_done');
            socketRef.current?.emit('leave_room', sessionDiscussionId);
            socketRef.current?.disconnect();
        };
    }, [jwtToken, courseId, groupId, sessionDiscussionId, socketUrl]);

    const loadMoreMessages = useCallback((sessionDiscussionIdParam: string, beforeMessageId: string) => {
        socketRef.current?.emit('load_more_messages', {
            sessionDiscussionId: sessionDiscussionIdParam,
            beforeMessageId,
        });
    }, []);

    const emitEditMessage = useCallback((messageId: string, content: string) => {
        socketRef.current?.emit('edit_message', {
            messageId,
            content,
            // The server accepts either spelling; `roomId` matches send_message.
            roomId: sessionDiscussionId,
            sessionDiscussionId,
        });
    }, [sessionDiscussionId]);

    const emitDeleteMessage = useCallback((messageId: string) => {
        socketRef.current?.emit('delete_message', {
            messageId,
            // The server's deleteMessageSchema is keyed on `roomId`; sending only
            // `sessionDiscussionId` made the payload fail validation silently.
            roomId: sessionDiscussionId,
            sessionDiscussionId,
        });
    }, [sessionDiscussionId]);

    const emitPinMessage = useCallback((messageId: string, content: string, senderName: string) => {
        socketRef.current?.emit('pin_message', {
            messageId,
            content,
            senderName,
            sessionDiscussionId,
        });
    }, [sessionDiscussionId]);

    const emitUnpinMessage = useCallback((messageId: string) => {
        socketRef.current?.emit('unpin_message', {
            messageId,
            sessionDiscussionId,
        });
    }, [sessionDiscussionId]);

    return {
        socketRef,
        isConnected,
        connectionError,
        connectionStatus,
        typingUsers,
        onlineUsers,
        discussionQuality,
        showQualityFeedback,
        hasMoreMessages,
        loadMoreMessages,
        emitEditMessage,
        emitDeleteMessage,
        emitPinMessage,
        emitUnpinMessage,
    };
}
