import { Head, usePage, Link } from '@inertiajs/react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useState, useEffect, useRef, FormEvent, useMemo, ChangeEvent, useCallback, memo, type ReactNode } from 'react';
import { MessageSquare, Send, Paperclip, X, CornerUpLeft, Users, Lock, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { useStudentNav } from '@/components/navigation/student-nav';
import { Course, SharedData } from '@/types';
import student from '@/routes/student';
import Breadcrumbs from '@/components/dashboard/Breadcrumbs';
import { LiquidGlassCard } from '@/components/Welcome/utils/helpers';
import { getAuthToken } from '@/lib/getAuthToken';
import { toast } from '@/components/ui/toaster';
import { useSocketRoom } from '@/hooks/useSocketRoom';
import { ChatSummaryCard } from '@/features/chat/summary/chat-summary-card';
import { useChatSummary } from '@/features/chat/summary/use-chat-summary';
import { parseSummaryText } from '@/features/chat/summary/parse-summary';
import { revokePendingFilePreviews } from '@/features/chat/file-preview-cleanup';
import { uploadAttachments } from '@/lib/upload-attachments';
import { useMessageWindow } from '@/features/chat/use-message-window';
import { safeAttachmentUrl } from '@/lib/attachment-url';
import { DropZoneOverlay } from '@/features/chat/DropZoneOverlay';
import { normalizeDroppedFile, useDragDrop } from '@/features/chat/useDragDrop';
import { focusFirstElement, trapFocusWithin } from '@/lib/focus-management';
import { Toast } from '@/components/chat/Toast';
import { ConnectionBanner } from '@/components/chat/ConnectionBanner';
import { SessionSummaryModal } from '@/components/chat/SessionSummaryModal';
import { ChatWeekMaterialsPanel } from '@/components/course/ChatWeekMaterialsPanel';
import { DocumentViewerModal, type DocumentViewerTarget } from '@/components/course/DocumentViewerModal';
import { BaseModal } from '@/components/ui/BaseModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChatSkeleton } from '@/components/ui/skeletons';
import ReactMarkdown from 'react-markdown';
import { formatAiOutput } from '@/lib/formatAiOutput';
import { sanitizeHtml } from '@/lib/sanitize';
import { useOfflineQueue } from '@/features/chat/use-offline-queue';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import {
    createOptimisticMessage,
    markMessageFailed,
    markMessageSending,
    reconcileIncomingMessage,
    toSocketPayload,
} from '@/features/chat/optimistic-message';
import { MessageActions } from './room/components/MessageActions';
import { MessageEditor } from './room/components/MessageEditor';
import { SearchBar } from './room/components/SearchBar';
import { SearchResults } from './room/components/SearchResults';
import { PinnedMessages } from './room/components/PinnedMessages';
import { useMessageSearch } from './room/hooks/useMessageSearch';
import { usePinnedMessages } from './room/hooks/usePinnedMessages';
import {
    aggregateCitedMaterials,
    buildMaterialIndexFromApi,
    citationChipLabel,
    type MaterialIndexEntry,
} from '@/features/chat/cited-materials';
import type { ChatCitation } from '@/types/chat';
import axios from 'axios';

type DisplayMessage = import('@/features/chat/optimistic-message').ChatDisplayMessage;
type FileAttachment = import('@/features/chat/optimistic-message').FileAttachment;
type ReplyTo = import('@/features/chat/optimistic-message').ReplyTo;

interface ProcessedMessage extends DisplayMessage {
    showAvatar: boolean;
    showName: boolean;
    showTime: boolean;
    isGrouped: boolean;
}

interface GroupMember {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface SessionDiscussionGoal {
    id: string;
    content: string;
    isValidated: boolean;
    createdBy: {
        id: string;
        name: string;
    };
    createdAt: string;
}

interface SessionDiscussion {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
    myGoal?: SessionDiscussionGoal | null;
}

interface Group {
    id: string;
    name: string;
    members?: GroupMember[];
    sessionDiscussions?: SessionDiscussion[];
}

// Types migrated to optimistic-message helpers

    interface PendingFile {
        file: File;
        preview?: string;
        id: string;
    }

    interface SessionDiscussionData {
        id: string;
        name: string;
        description?: string;
        isDefault: boolean;
        weekTitle?: string | null;
        weekIndex?: number | null;
        groupId: string;
        isClosed?: boolean;
        closedAt?: string;
        hasReflection?: boolean;
        needsReflection?: boolean;
        myGoal?: SessionDiscussionGoal | null;
    }

const isClosedSessionDiscussion = (space: SessionDiscussionData) => {
    return Boolean(space.isClosed || space.closedAt || (!space.isDefault && space.closedAt));
};

interface Props {
    course: Course;
    group: Group;
    sessionDiscussion: SessionDiscussionData;
    socketUrl?: string;
}

    // Helper to check if two messages are in the same minute
const isSameMinute = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate() &&
           d1.getHours() === d2.getHours() &&
           d1.getMinutes() === d2.getMinutes();
};

// Avatar component
const Avatar = ({ 
    name, 
    type, 
    className = '' 
}: { 
    name: string; 
    type: 'user' | 'ai' | 'bot' | 'system'; 
    className?: string;
}) => {
    const bgColor = type === 'ai' || type === 'bot' 
        ? 'bg-[rgba(136,22,28,0.08)] border border-[rgba(136,22,28,0.12)]' 
        : type === 'system'
        ? 'bg-[rgba(136,22,28,0.12)] border border-[rgba(136,22,28,0.2)]'
        : 'bg-[rgba(107,114,128,0.08)] border border-[rgba(255,255,255,0.5)]';
    
    return (
        <div className={`flex items-center justify-center rounded-full ${bgColor} ${className}`}>
            {type === 'ai' || type === 'bot' ? (
                <svg className="h-4 w-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            ) : type === 'system' ? (
                <svg className="h-4 w-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ) : (
                <span className="text-sm font-bold text-brand-dark">
                    {name?.charAt(0)?.toUpperCase() || '?'}
                </span>
            )}
        </div>
    );
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (type: string): boolean => type.startsWith('image/');

const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isAIMessage = (message: DisplayMessage) => message.sender_type === 'ai';
const isBotMessage = (message: DisplayMessage) => message.sender_type === 'bot';
const isSystemMessage = (message: DisplayMessage) => message.sender_type === 'system';

const getAvatarType = (message: DisplayMessage): 'user' | 'ai' | 'bot' | 'system' => {
    if (isAIMessage(message)) return 'ai';
    if (isBotMessage(message)) return 'bot';
    if (isSystemMessage(message)) return 'system';
    return 'user';
};

const getSenderDisplayName = (message: DisplayMessage): string => {
    if (isAIMessage(message)) return 'Asisten AI';
    if (isBotMessage(message)) return 'Bot Kolabri';
    if (isSystemMessage(message)) return 'Kolabri';
    return message.sender_name;
};

interface MessageItemProps {
    message: ProcessedMessage;
    ownMessage: boolean;
    renderMessageContent: (content: string, mentions?: string[]) => ReactNode;
    onReply: (message: DisplayMessage) => void;
    onDelete: (messageId: string) => void;
    onRetry: (message: DisplayMessage) => void;
    onOpenImagePreview: (url: string, name: string) => void;
    onDownloadAttachment: (url: string, name: string) => void;
    onOpenCitation: (cite: ChatCitation) => void;
    materialIndex: Map<string, MaterialIndexEntry>;
    onEdit: (messageId: string) => void;
    onPin: (messageId: string) => void;
    onUnpin: (messageId: string) => void;
    onCopy: (content: string) => void;
    canPin: boolean;
    isPinned: boolean;
    isEditing: boolean;
    editingContent: string;
    onSaveEdit: (content: string) => void;
    onCancelEdit: () => void;
    isSavingEdit: boolean;
    isHighlighted: boolean;
    canEdit: boolean;
}

const MessageItem = memo(function MessageItem({
    message,
    ownMessage,
    renderMessageContent,
    onReply,
    onDelete,
    onRetry,
    onOpenImagePreview,
    onDownloadAttachment,
    onOpenCitation,
    materialIndex,
    onEdit,
    onPin,
    onUnpin,
    onCopy,
    canPin,
    isPinned,
    isEditing,
    editingContent,
    onSaveEdit,
    onCancelEdit,
    isSavingEdit,
    isHighlighted,
    canEdit,
}: MessageItemProps) {
    const isDeleted = message.is_deleted === true;

    return (
        <motion.div
            id={`message-${message.id}`}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ layout: { duration: 0.2 } }}
            aria-label={`Pesan dari ${getSenderDisplayName(message)}`}
            className={`group flex items-start gap-2 ${ownMessage ? 'flex-row-reverse' : 'flex-row'} ${message.isGrouped ? 'mt-0.5' : 'mt-3'} ${isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg -mx-2 px-2 py-1' : ''}`}
        >
            {!ownMessage && (
                <div className="w-6 flex-shrink-0 pt-0.5 sm:w-8">
                    {message.showAvatar && (
                        <Avatar
                            name={message.sender_name}
                            type={getAvatarType(message)}
                            className="h-6 w-6 sm:h-8 sm:w-8"
                        />
                    )}
                </div>
            )}

            <div className={`group flex max-w-[85%] flex-col sm:max-w-[70%] ${ownMessage ? 'items-end' : 'items-start'}`}>
                {!ownMessage && message.showName && (
                    <span className="mb-1 ml-1 text-xs font-medium text-brand-muted-dark">
                        {getSenderDisplayName(message)}
                    </span>
                )}

                {message.reply_to && (
                    <div
                        className={`mb-1 flex items-center gap-1 rounded-xl px-2 py-1 text-xs sm:px-3 sm:py-1.5 ${
                            ownMessage ? 'text-white' : 'text-brand-muted-dark'
                        }`}
                        style={{
                            background: ownMessage ? 'rgba(136,22,28,0.3)' : 'rgba(107,114,128,0.15)',
                        }}
                    >
                        <CornerUpLeft className="hidden h-3 w-3 flex-shrink-0 sm:block" />
                        <span className="font-medium">{message.reply_to.senderName}:</span>
                        <span className="max-w-[100px] truncate sm:max-w-[150px]">{message.reply_to.content}</span>
                    </div>
                )}

                {message.attachments && message.attachments.length > 0 && (
                    <div className="mb-1 flex flex-wrap gap-1.5 sm:gap-2">
                        {message.attachments.map((attachment) => {
                            const attachmentUrl = safeAttachmentUrl(attachment.url);

                            return (
                                <div key={attachment.id}>
                                    {isImageFile(attachment.type) ? (
                                        <button
                                            type="button"
                                            onClick={() => onOpenImagePreview(attachmentUrl, attachment.name)}
                                            className="block overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                                            aria-label={`Buka pratinjau gambar ${attachment.name}`}
                                        >
                                            <img
                                                src={attachmentUrl}
                                                alt={attachment.name}
                                                className="max-h-32 max-w-[180px] rounded-xl object-cover transition-transform hover:scale-105 sm:max-h-48 sm:max-w-[250px]"
                                                loading="lazy"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onDownloadAttachment(attachmentUrl, attachment.name)}
                                            className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors sm:gap-2 sm:px-3 sm:py-2 ${
                                                ownMessage ? 'text-white' : 'text-brand-dark'
                                            }`}
                                            aria-label={`Unduh file ${attachment.name}`}
                                            style={{
                                                background: ownMessage ? 'rgba(136,22,28,0.3)' : 'rgba(107,114,128,0.15)',
                                            }}
                                        >
                                            <svg className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <div className="min-w-0 text-left">
                                                <p className="max-w-[100px] truncate text-xs font-medium sm:max-w-none sm:text-sm">{attachment.name}</p>
                                                <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                                            </div>
                                            <svg className="h-3.5 w-3.5 flex-shrink-0 opacity-60 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {message.content && (
                    <div className={`flex items-center gap-1 ${ownMessage ? 'flex-row-reverse' : ''}`}>
                        <div
                            className={`rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 ${
                                ownMessage
                                    ? 'text-white'
                                    : isAIMessage(message) || isBotMessage(message)
                                    ? 'text-brand-dark'
                                    : isSystemMessage(message)
                                    ? 'text-brand-dark'
                                    : 'text-brand-dark'
                            }`}
                            style={{
                                background: ownMessage
                                    ? 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)'
                                    : isAIMessage(message) || isBotMessage(message)
                                    ? 'rgba(136,22,28,0.08)'
                                    : isSystemMessage(message)
                                    ? 'linear-gradient(135deg, rgba(136,22,28,0.12) 0%, rgba(136,22,28,0.06) 100%)'
                                    : 'rgba(255,255,255,0.7)',
                                border: ownMessage
                                    ? '1px solid rgba(255,255,255,0.18)'
                                    : isAIMessage(message) || isBotMessage(message)
                                    ? '1px solid rgba(136,22,28,0.15)'
                                    : isSystemMessage(message)
                                    ? '1px solid rgba(136,22,28,0.2)'
                                    : '1px solid rgba(255,255,255,0.5)',
                            }}
                        >
                            {(isAIMessage(message) || isBotMessage(message)) ? (
                                <div className={`prose prose-sm max-w-none text-sm ${isDeleted ? 'italic opacity-60' : ''}`}>
                                    <ReactMarkdown>{sanitizeHtml(formatAiOutput(message.content))}</ReactMarkdown>
                                </div>
                            ) : (
                                <p className={`whitespace-pre-wrap text-sm ${isDeleted ? 'italic opacity-60' : ''}`}>
                                    {renderMessageContent(message.content, message.mentions)}
                                </p>
                            )}
                            {message.edited_at && !isDeleted && (
                                <p className="mt-0.5 text-[10px] opacity-50">
                                    Diedit
                                </p>
                            )}
                            {isAIMessage(message) && (message.citations?.length ?? 0) > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {message.citations!.map((cite) => (
                                        <button
                                            key={`${cite.course_material_id}-${cite.page ?? 0}-${cite.label ?? ''}`}
                                            type="button"
                                            onClick={() => onOpenCitation(cite)}
                                            className="inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium text-brand-primary transition-colors hover:bg-[rgba(136,22,28,0.08)]"
                                            style={{ borderColor: 'rgba(136,22,28,0.2)', background: 'rgba(255,255,255,0.6)' }}
                                        >
                                            <span className="truncate">{citationChipLabel(cite, materialIndex)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={() => onReply(message)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-muted-dark transition-colors hover:bg-white/50 hover:text-brand-primary"
                                title="Balas"
                                aria-label="Balas pesan"
                            >
                                <CornerUpLeft className="h-4 w-4" />
                            </button>
                            <MessageActions
                                messageId={message.id}
                                isOwn={ownMessage}
                                isDeleted={isDeleted}
                                isPinned={isPinned}
                                canPin={canPin}
                                canEdit={canEdit && !isDeleted}
                                onEdit={() => onEdit(message.id)}
                                onDelete={() => onDelete(message.id)}
                                onPin={() => onPin(message.id)}
                                onUnpin={() => onUnpin(message.id)}
                                onCopy={() => onCopy(message.content)}
                            />
                        </div>
                    </div>
                )}

                {isEditing && (
                    <MessageEditor
                        initialContent={editingContent}
                        onSave={onSaveEdit}
                        onCancel={onCancelEdit}
                        isSaving={isSavingEdit}
                    />
                )}

                {message.showTime && (
                    <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-xs text-brand-muted-dark">
                            {formatTime(message.created_at)}
                        </span>
                    </div>
                )}

                {ownMessage && message.deliveryStatus === 'sending' && (
                    <div className="mt-1 text-xs text-brand-muted-dark">
                        <span>Mengirim...</span>
                    </div>
                )}
                {ownMessage && message.deliveryStatus === 'retrying' && (
                    <div className="mt-1 text-xs text-brand-muted-dark">
                        <span>Retrying...</span>
                    </div>
                )}
                {ownMessage && message.deliveryStatus === 'failed' && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-brand-muted-dark">
                        <span>Gagal mengirim</span>
                        <button
                            type="button"
                            onClick={() => onRetry(message)}
                            className="rounded px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-primary"
                            style={{ background: 'var(--color-brand-primary)' }}
                            aria-label="Coba lagi"
                        >
                            Coba lagi
                        </button>
                    </div>
                )}
            </div>

            {ownMessage && <div className="w-6 flex-shrink-0 sm:w-8" />}
        </motion.div>
    );
});

MessageItem.displayName = 'MessageItem';

// Style constants matching the design system
const headingStyle = {
    color: 'var(--color-brand-dark)',
} as const;

export default function StudentChatRoom({ course, group, sessionDiscussion, socketUrl }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [jwtToken, setJwtToken] = useState('');
    const navItems = useStudentNav('chat-room', { courseId: course.id });
    const confirmDeliveredRef = useRef<(clientId?: string) => Promise<void>>(async () => {});
    const hasGoal = !!sessionDiscussion.myGoal;
    const goal = sessionDiscussion.myGoal;
    const [aiSummary, setAiSummary] = useState<null | { goalAchieved: boolean; topics: string[]; contributions: Record<string, number>; assessment: string }>(null);
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
    const [showAiSummaryModal, setShowAiSummaryModal] = useState(false);
    const initialSessionClosed = isClosedSessionDiscussion(sessionDiscussion);
    const [sessionClosed, setSessionClosed] = useState(initialSessionClosed);
    const [, setSessionClosedAt] = useState<string | null>(sessionDiscussion.closedAt || null);
    const [sessionClosedMessage, setSessionClosedMessage] = useState<string | null>(
        initialSessionClosed ? 'Sesi diskusi ini telah ditutup.' : null
    );
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [isInitialMessagesLoading, setIsInitialMessagesLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const { clear: clearDraft } = useDraftAutosave(sessionDiscussion.id, newMessage, setNewMessage);
    useEffect(() => {
        getAuthToken().then(setJwtToken).catch((err) => {
            console.error(err);
            toast.error('Gagal mengambil token autentikasi. Chat mungkin tidak terhubung.');
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(
                    `/student/courses/${course.id}/session-discussions/${sessionDiscussion.id}/materials`,
                    { headers: { Accept: 'application/json' }, credentials: 'same-origin' },
                );
                if (!res.ok || cancelled) {
                    return;
                }
                const json = (await res.json()) as {
                    primary: Array<{ material: MaterialIndexEntry }>;
                    earlier: Array<{ material: MaterialIndexEntry }>;
                };
                if (!cancelled) {
                    setMaterialIndex(buildMaterialIndexFromApi(json));
                }
            } catch {
                void 0;
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [course.id, sessionDiscussion.id]);

    // Fallback: stop loading skeleton after 5s even if socket doesn't report back
    useEffect(() => {
        const timer = setTimeout(() => setIsInitialMessagesLoading(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    const { socketRef, isConnected, connectionError, connectionStatus, typingUsers, onlineUsers, discussionQuality, showQualityFeedback, hasMoreMessages, loadMoreMessages, emitEditMessage, emitDeleteMessage, emitPinMessage, emitUnpinMessage } = useSocketRoom({
        jwtToken,
        courseId: course.id,
        groupId: group.id,
        sessionDiscussionId: sessionDiscussion.id,
        socketUrl,
        onSessionClosed: (payload) => {
            setSessionClosed(true);
            setSessionClosedAt((prev) => payload?.closedAt ?? prev ?? new Date().toISOString());
            setSessionClosedMessage(payload?.message || 'Sesi diskusi ini telah ditutup.');
            setIsSummaryVisible(true);
        },
        onSessionReopened: () => {
            setSessionClosed(false);
            setSessionClosedAt(null);
            setSessionClosedMessage(null);
        },
        onMessagesLoaded: (loadedMessages) => {
            setMessages(loadedMessages);
            setIsInitialMessagesLoading(false);
        },
        onMessagesPageLoaded: (olderMessages) => {
            isLoadingMoreRef.current = true;
            const container = messagesContainerRef.current;
            const previousScrollHeight = container?.scrollHeight ?? 0;
            setMessages((prev) => [...olderMessages, ...prev]);
            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight - previousScrollHeight;
                }
                isLoadingMoreRef.current = false;
            });
        },
        onMessageReceived: (_display, raw) => {
            void confirmDeliveredRef.current(raw.clientId);
            setMessages((prev) => reconcileIncomingMessage(prev, raw));
        },
        onMessageDeleted: (messageId) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? { ...msg, content: '[Pesan telah dihapus]', is_deleted: true, deleted_at: new Date().toISOString() }
                        : msg
                )
            );
        },
        onMessageEdited: (messageId, newContent, editedAt) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? { ...msg, content: newContent, edited_at: editedAt }
                        : msg
                )
            );
        },
        onMessagePinned: (pinnedMessage) => {
            addPinnedMessage({
                id: `pin-${pinnedMessage.messageId}`,
                message_id: pinnedMessage.messageId,
                conversation_id: pinnedMessage.conversationId,
                pinned_by: '',
                content: pinnedMessage.content,
                sender_name: pinnedMessage.sender_name,
                pinned_at: pinnedMessage.pinned_at,
            });
        },
        onMessageUnpinned: (messageId) => {
            removePinnedMessage(messageId);
        },
        onMessageClassified: (classifications) => {
            setMessages((prev) =>
                prev.map((msg) => {
                    const classification = classifications.find((c) => c.messageId === msg.id);
                    return classification ? { ...msg, isRelevant: classification.isRelevant } : msg;
                })
            );
        },
    });

    useEffect(() => {
        if (connectionError) {
            setToastMessage({ message: connectionError, type: 'error' });
        }
    }, [connectionError]);

    const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [showGoalBanner, setShowGoalBanner] = useState(!hasGoal);
    const [isClosingSession, setIsClosingSession] = useState(false);
    const [closeSessionError, setCloseSessionError] = useState<string | null>(null);
    const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
    const [initialSummary, setInitialSummary] = useState<import('@/features/chat/summary/types').ChatDiscussionSummary | null>(null);
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [isEditingSaving, setIsEditingSaving] = useState(false);

    const {
        results: searchResults,
        hasMore: searchHasMore,
        isLoading: searchIsLoading,
        totalResults: searchTotalResults,
        isActive: searchIsActive,
        search: performSearch,
        loadMore: loadMoreSearch,
        clear: clearSearch,
        scrollToMessage: scrollToSearchResult,
        highlightMessageId: searchHighlightId,
    } = useMessageSearch({ conversationId: sessionDiscussion.id });

    // Client-side search for discussion session (sesi diskusi) messages.
    // The server endpoint /api/chat/messages/search only queries ChatMessage rows by conversation_id
    // (used by regular group/AI chats). Discussion sessions store messages as ChatLog (Mongo, keyed by sessionDiscussionId)
    // and deliver them via socket history + realtime. Hence server search always returns 0 for sesi diskusis,
    // even when "hai" etc. are visible in the live messages list.
    // We filter the already-loaded `messages` state (includes AI welcome, user msgs, optimistic, history).
    const [localSearchResults, setLocalSearchResults] = useState<any[]>([]);
    const [localSearchTotal, setLocalSearchTotal] = useState(0);
    const [localSearchActive, setLocalSearchActive] = useState(false);
    const [localSearchLoading, setLocalSearchLoading] = useState(false);

    const performLocalSearch = useCallback((query: string) => {
        if (!query || query.trim().length < 2) {
            clearLocalSearch();
            return;
        }
        setLocalSearchLoading(true);
        const q = query.trim();
        const lower = q.toLowerCase();
        const matches = messages.filter((m: DisplayMessage) =>
            m.content && m.content.toLowerCase().includes(lower)
        );
        const mapped = matches.map((m: DisplayMessage) => {
            const content = m.content || '';
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const highlighted = content.replace(
                new RegExp(`(${escaped})`, 'gi'),
                '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>'
            );
            return {
                id: m.id,
                content,
                highlighted_content: highlighted,
                sender_name: m.sender_name || 'Unknown',
                created_at: m.created_at,
            };
        });
        setLocalSearchResults(mapped);
        setLocalSearchTotal(mapped.length);
        setLocalSearchActive(true);
        setLocalSearchLoading(false);
    }, [messages]);

    const clearLocalSearch = useCallback(() => {
        setLocalSearchResults([]);
        setLocalSearchTotal(0);
        setLocalSearchActive(false);
        setLocalSearchLoading(false);
    }, []);

    const combinedClearSearch = useCallback(() => {
        clearSearch();
        clearLocalSearch();
    }, [clearSearch]);

    const {
        pinnedMessages,
        pinMessage: pinMessageApi,
        unpinMessage: unpinMessageApi,
        refreshPinned,
    } = usePinnedMessages({ conversationId: sessionDiscussion.id, socketRef: socketRef as React.RefObject<{ emit: (event: string, data: unknown) => void } | null> });

    const addPinnedMessage = useCallback((msg: import('./room/components/PinnedMessages').PinnedMessage) => {
        refreshPinned();
    }, [refreshPinned]);

    const removePinnedMessage = useCallback((messageId: string) => {
        refreshPinned();
    }, [refreshPinned]);

    const { state: summaryState, retry: retrySummary } = useChatSummary({
        courseId: course.id,
        sessionDiscussionId: sessionDiscussion.id,
        enabled: isSummaryVisible,
        initialSummary,
    });

    const [showReflectionModal, setShowReflectionModal] = useState(sessionDiscussion.needsReflection || false);
    const [reflectionContent, setReflectionContent] = useState('');
    const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);
    const [reflectionError, setReflectionError] = useState<string | null>(null);
    const [hasSubmittedReflection, setHasSubmittedReflection] = useState(sessionDiscussion.hasReflection || false);

    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const pendingFilesRef = useRef<PendingFile[]>([]);
    useEffect(() => {
        pendingFilesRef.current = pendingFiles;
    }, [pendingFiles]);
    useEffect(() => {
        return () => {
            revokePendingFilePreviews(pendingFilesRef.current);
        };
    }, []);
    const [isUploading, setIsUploading] = useState(false);
    const { files: droppedFiles, isDragging, clearFiles, dragProps } = useDragDrop({
        onValidationError: (message) => {
            setToastMessage({ message, type: 'error' });
        },
    });

    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

    const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [documentViewer, setDocumentViewer] = useState<DocumentViewerTarget | null>(null);
    const [materialIndex, setMaterialIndex] = useState<Map<string, MaterialIndexEntry>>(() => new Map());

    const citedMaterials = useMemo(
        () => aggregateCitedMaterials(messages, materialIndex),
        [messages, materialIndex],
    );

    const [showRightSidebar, setShowRightSidebar] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isLoadingMoreRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const rightSidebarRef = useRef<HTMLElement>(null);
    const imagePreviewDialogRef = useRef<HTMLDivElement>(null);
    const reflectionModalRef = useRef<HTMLDivElement>(null);
    const closeConfirmModalRef = useRef<HTMLDivElement>(null);
    const lastTriggerRef = useRef<HTMLElement | null>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [qualityPanelExpanded, setQualityPanelExpanded] = useState(true);
    const typingStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    const showCloseError = useCallback((message: string) => {
        setCloseSessionError(message);
        if (closeErrorTimeoutRef.current) {
            clearTimeout(closeErrorTimeoutRef.current);
        }
        closeErrorTimeoutRef.current = setTimeout(() => {
            setCloseSessionError((prev) => (prev === message ? null : prev));
            closeErrorTimeoutRef.current = null;
        }, 4000);
    }, []);

    const rememberTrigger = useCallback((element: HTMLElement | null) => {
        lastTriggerRef.current = element;
    }, []);

    const restoreFocusToTrigger = useCallback(() => {
        const trigger = lastTriggerRef.current;

        if (!trigger) {
            return;
        }

        window.requestAnimationFrame(() => {
            if (trigger.isConnected) {
                trigger.focus();
            }
        });
    }, []);

    const handleDialogKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLElement>, onClose?: () => void, canClose = true) => {
            if (event.key === 'Escape' && canClose) {
                event.preventDefault();
                event.stopPropagation();
                onClose?.();
                return;
            }

            trapFocusWithin(event.currentTarget, event);
        },
        []
    );

    // AI mention option
    const aiMentionOption = useMemo(
        () => ({
            id: 'ai',
            name: 'AI Assistant',
            email: 'Tanyakan kepada AI',
            isAI: true,
        }),
        []
    );

    // Helper builders for optimistic messaging (Task 4)
    const createClientId = () => {
        return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    };

    const { queueOrSend, confirmDelivered } = useOfflineQueue({
        socketRef,
        isConnected,
        onMessageQueued: (clientId) => {
            setMessages((prev) => markMessageSending(prev, clientId, 'sending', 0));
        },
        onMessageRetrying: (clientId, attempts) => {
            setMessages((prev) => markMessageSending(prev, clientId, 'retrying', attempts));
        },
        onMessageFailed: (clientId, attempts) => {
            setMessages((prev) => markMessageFailed(markMessageSending(prev, clientId, 'failed', Math.max(attempts - 1, 0)), clientId));
        },
    });

    confirmDeliveredRef.current = confirmDelivered;

    const emitChatMessage = useCallback((message: DisplayMessage) => {
        if (!socketRef.current) {
            setMessages((prev) => markMessageFailed(prev, message.clientId || message.id));
            return Promise.resolve({ queued: false as const, attempts: 0 });
        }

        return queueOrSend({
            message,
            payload: toSocketPayload(message, {
                roomId: sessionDiscussion.id,
                courseId: course.id,
                groupId: group.id,
            }),
        });
    }, [sessionDiscussion.id, course.id, group.id, queueOrSend, socketRef]);

    const clearTypingDebounceTimers = useCallback(() => {
        if (typingStartTimeoutRef.current) {
            clearTimeout(typingStartTimeoutRef.current);
            typingStartTimeoutRef.current = null;
        }

        if (typingStopTimeoutRef.current) {
            clearTimeout(typingStopTimeoutRef.current);
            typingStopTimeoutRef.current = null;
        }
    }, []);

    const emitTypingState = useCallback((nextIsTyping: boolean) => {
        const roomId = sessionDiscussion.id;
        socketRef.current?.emit('typing', { roomId, isTyping: nextIsTyping });
    }, [sessionDiscussion.id, socketRef]);

    const scheduleStopTyping = useCallback(() => {
        if (typingStopTimeoutRef.current) {
            clearTimeout(typingStopTimeoutRef.current);
        }

        typingStopTimeoutRef.current = setTimeout(() => {
            typingStopTimeoutRef.current = null;
            if (!isTypingRef.current) {
                return;
            }

            isTypingRef.current = false;
            emitTypingState(false);
        }, 1000);
    }, [emitTypingState]);

    const stopTypingNow = useCallback(() => {
        clearTypingDebounceTimers();
        if (!isTypingRef.current) {
            return;
        }

        isTypingRef.current = false;
        emitTypingState(false);
    }, [clearTypingDebounceTimers, emitTypingState]);

    useEffect(() => {
        return () => {
            clearTypingDebounceTimers();
        };
    }, [clearTypingDebounceTimers]);

    const handleSubmit = async (e: FormEvent) => {
        if (sessionClosed) return;
        e.preventDefault();
        if ((!newMessage.trim() && pendingFiles.length === 0) || !socketRef.current) return;

        stopTypingNow();

        // Extract mentions
        const mentions = extractMentions(newMessage);

        // Upload files if any
        let attachments: FileAttachment[] = [];
        if (pendingFiles.length > 0) {
            setIsUploading(true);
            try {
                const uploaded = await uploadAttachments(pendingFiles.map((pf) => pf.file), undefined, sessionDiscussion.id);
                attachments = uploaded.map((u, i) => ({
                    id: pendingFiles[i].id,
                    name: u.name,
                    type: u.type,
                    size: u.size,
                    url: u.url,
                    previewUrl: u.previewUrl ?? undefined,
                }));
            } catch (error) {
                console.error('File upload failed:', error);
                toast.error('Gagal mengunggah file');
            }
            setIsUploading(false);
        }

        const clientId = createClientId();
        const optimisticMessage = createOptimisticMessage({
            clientId,
            senderId: auth.user?.id || 'unknown',
            senderName: auth.user?.name || 'You',
            senderType: auth.user?.role || 'student',
            content: newMessage.trim(),
            createdAt: new Date().toISOString(),
            replyTo: replyingTo || undefined,
            attachments,
            mentions,
        });

        setMessages((prev) => [...prev, optimisticMessage]);
        void emitChatMessage(optimisticMessage);

        setNewMessage('');
        clearDraft();
        setReplyingTo(null);
        revokePendingFilePreviews(pendingFiles);
        setPendingFiles([]);
    };

    const handleRetryMessage = useCallback((message: DisplayMessage) => {
        const retryId = message.clientId || message.id;
        setMessages((prev) => markMessageSending(prev, retryId, 'sending', 0));

        const retryMessage: DisplayMessage = {
            ...message,
            clientId: retryId,
            id: retryId,
            deliveryStatus: 'sending',
            isOptimistic: true,
            retryCount: 0,
        };

        void emitChatMessage(retryMessage);
    }, [emitChatMessage]);
    const filteredMembers = useMemo(() => {
        const filter = mentionFilter.toLowerCase();
        
        // Check if AI matches the filter
        const aiMatches = 'ai'.includes(filter) || 
                         'ai assistant'.includes(filter) ||
                         filter === '';
        
        // Filter group members
        const members = (group.members || []).filter(
            (member) =>
                member.id !== auth.user?.id &&
                (member.name.toLowerCase().includes(filter) ||
                 member.email.toLowerCase().includes(filter))
        );
        
        // Add AI option at the top if it matches
        if (aiMatches) {
            return [aiMentionOption, ...members];
        }
        
        return members;
    }, [aiMentionOption, group.members, mentionFilter, auth.user?.id]);

    // Process messages to determine grouping (show avatar on FIRST message of consecutive group - at top)
    const processedMessages = useMemo((): ProcessedMessage[] => {
        return messages.map((message, index) => {
            const nextMessage = messages[index + 1];
            const prevMessage = messages[index - 1];
            
            // Check if this is the last message in a consecutive group from same sender
            const isLastInGroup = !nextMessage || 
                nextMessage.sender_id !== message.sender_id ||
                !isSameMinute(message.created_at, nextMessage.created_at);
            
            // Check if this is the first message in a consecutive group
            const isFirstInGroup = !prevMessage || 
                prevMessage.sender_id !== message.sender_id ||
                !isSameMinute(message.created_at, prevMessage.created_at);

            return {
                ...message,
                showAvatar: isFirstInGroup,
                showName: isFirstInGroup,
                showTime: isLastInGroup,
                isGrouped: !isFirstInGroup,
            };
        });
    }, [messages]);

    const messageWindow = useMessageWindow(processedMessages);
    const visibleMessages = messageWindow.visibleMessages;
    const hiddenCount = messageWindow.hiddenCount;
    const isVirtualized = messageWindow.isVirtualized;
    const showAllMessages = messageWindow.showAll;


    useEffect(() => {
        return () => {
            if (closeErrorTimeoutRef.current) {
                clearTimeout(closeErrorTimeoutRef.current);
            }
        };
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (isLoadingMoreRef.current) return;
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages]);

    // Handle scroll to show/hide scrollbar
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setIsScrolling(true);
            
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 1500);
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const handleTyping = useCallback(() => {
        if (sessionClosed) return;

        if (typingStartTimeoutRef.current) {
            clearTimeout(typingStartTimeoutRef.current);
            typingStartTimeoutRef.current = null;
        }

        if (typingStopTimeoutRef.current) {
            clearTimeout(typingStopTimeoutRef.current);
            typingStopTimeoutRef.current = null;
        }

        if (!isTypingRef.current) {
            typingStartTimeoutRef.current = setTimeout(() => {
                typingStartTimeoutRef.current = null;
                if (isTypingRef.current) {
                    return;
                }

                isTypingRef.current = true;
                emitTypingState(true);
            }, 300);
        }

        scheduleStopTyping();
    }, [emitTypingState, scheduleStopTyping, sessionClosed]);

    // Stop typing when input loses focus
    const handleInputBlur = useCallback(() => {
        stopTypingNow();
        // Delay hiding mention list to allow click on suggestions
        setTimeout(() => setShowMentionList(false), 200);
    }, [stopTypingNow]);

    // Handle file selection
    const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        if (sessionClosed) return;
        const files = e.target.files;
        if (!files) return;

        const newFiles: PendingFile[] = Array.from(files).map((rawFile) => {
            const file = normalizeDroppedFile(rawFile);
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
            let preview: string | undefined;
            
            if (file.type.startsWith('image/')) {
                preview = URL.createObjectURL(file);
            }
            
            return { file, preview, id };
        });

        setPendingFiles((prev) => [...prev, ...newFiles]);
        e.target.value = '';
    }, [sessionClosed]);

    useEffect(() => {
        if (sessionClosed || droppedFiles.length === 0) return;

        const newFiles: PendingFile[] = droppedFiles.map((file) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
            let preview: string | undefined;

            if (file.type.startsWith('image/')) {
                preview = URL.createObjectURL(file);
            }

            return { file, preview, id };
        });

        setPendingFiles((prev) => [...prev, ...newFiles]);
        clearFiles();
    }, [clearFiles, droppedFiles, sessionClosed]);

    // Remove pending file
    const removePendingFile = useCallback((id: string) => {
        setPendingFiles((prev) => {
            const file = prev.find((f) => f.id === id);
            if (file?.preview) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter((f) => f.id !== id);
        });
    }, []);

    // Handle mention input
    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);
        handleTyping();

        // Check for @ mentions
        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(atIndex + 1);
            if (!textAfterAt.includes(' ')) {
                setShowMentionList(true);
                setMentionFilter(textAfterAt);
                setMentionStartIndex(atIndex);
                setSelectedMentionIndex(0);
                return;
            }
        }
        setShowMentionList(false);
    }, [handleTyping]);

    // Insert mention
    const insertMention = useCallback((member: { id: string; name: string; email: string; isAI?: boolean }) => {
        const beforeMention = newMessage.slice(0, mentionStartIndex);
        const cursorPos = inputRef.current?.selectionStart || newMessage.length;
        const afterMention = newMessage.slice(cursorPos);
        
        // Use "@ai" for AI, otherwise use member name
        const mentionText = member.isAI ? '@ai' : `@${member.name}`;
        const newText = `${beforeMention}${mentionText} ${afterMention}`;
        setNewMessage(newText);
        setShowMentionList(false);
        setMentionFilter('');
        inputRef.current?.focus();
    }, [newMessage, mentionStartIndex]);

    // Handle keyboard navigation in mention list
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showMentionList || filteredMembers.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedMentionIndex((prev) => 
                prev < filteredMembers.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedMentionIndex((prev) => 
                prev > 0 ? prev - 1 : filteredMembers.length - 1
            );
        } else if (e.key === 'Enter' && showMentionList) {
            e.preventDefault();
            insertMention(filteredMembers[selectedMentionIndex]);
        } else if (e.key === 'Escape') {
            setShowMentionList(false);
        }
    };

    // Extract mentions from message
    const extractMentions = (text: string): string[] => {
        const mentions: string[] = [];
        const mentionRegex = /@(\w+(?:\s\w+)*)/g;
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
            const mentionName = match[1];
            const member = group.members?.find(
                (m) => m.name.toLowerCase() === mentionName.toLowerCase()
            );
            if (member) {
                mentions.push(member.id);
            }
        }
        
        return mentions;
    };

    // Open image preview
    const openImagePreview = useCallback((url: string, name: string) => {
        setPreviewImage({ url, name });
        setImageZoom(1);
    }, []);

    // Close image preview
    const closeImagePreview = useCallback(() => {
        setPreviewImage(null);
        setImageZoom(1);
        restoreFocusToTrigger();
    }, [restoreFocusToTrigger]);

    // Zoom in
    const zoomIn = useCallback(() => {
        setImageZoom((prev) => Math.min(prev + 0.25, 3));
    }, []);

    // Zoom out
    const zoomOut = useCallback(() => {
        setImageZoom((prev) => Math.max(prev - 0.25, 0.5));
    }, []);

    // Reset zoom
    const resetZoom = useCallback(() => {
        setImageZoom(1);
    }, []);

    // Download image
    const downloadImage = useCallback((url: string, name: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const openCitation = useCallback(
        (cite: ChatCitation) => {
            const meta = materialIndex.get(cite.course_material_id);
            if (!meta) {
                setToastMessage({ message: 'Materi sitasi belum tersedia di daftar minggu ini.', type: 'info' });
                return;
            }
            const streamUrl = `/student/courses/${course.id}/materials/${meta.id}/stream?sessionDiscussion=${encodeURIComponent(sessionDiscussion.id)}`;
            setDocumentViewer({
                title: cite.label ?? meta.title,
                fileName: meta.file_name,
                streamUrl,
                fileType: meta.file_type,
            });
        },
        [materialIndex, course.id, sessionDiscussion.id],
    );

    // Handle keyboard for image preview
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!previewImage) return;
            
            if (e.key === 'Escape') {
                closeImagePreview();
            } else if (e.key === '+' || e.key === '=') {
                zoomIn();
            } else if (e.key === '-') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoom();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeImagePreview, previewImage, resetZoom, zoomIn, zoomOut]);

    useEffect(() => {
        if (previewImage && imagePreviewDialogRef.current) {
            focusFirstElement(imagePreviewDialogRef.current);
        }
    }, [previewImage]);

    useEffect(() => {
        if (showReflectionModal && reflectionModalRef.current) {
            focusFirstElement(reflectionModalRef.current);
        }
    }, [showReflectionModal]);

    useEffect(() => {
        if (showCloseConfirmModal && closeConfirmModalRef.current) {
            focusFirstElement(closeConfirmModalRef.current);
        }
    }, [showCloseConfirmModal]);

    useEffect(() => {
        if (showRightSidebar && rightSidebarRef.current) {
            focusFirstElement(rightSidebarRef.current);
        }
    }, [showRightSidebar]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const viewport = window.visualViewport;
        if (viewport) {
            const handler = () => {
                setKeyboardVisible(viewport.height < window.innerHeight * 0.8);
            };

            handler();
            viewport.addEventListener('resize', handler);

            return () => {
                viewport.removeEventListener('resize', handler);
            };
        }

        const handler = () => {
            setKeyboardVisible(window.innerHeight < 500);
        };

        handler();
        window.addEventListener('resize', handler);

        return () => {
            window.removeEventListener('resize', handler);
        };
    }, []);

    // Render message content with highlighted mentions and basic markdown
    const renderMessageContent = useCallback((content: string, mentions?: string[]) => {
        // Simple highlight for @mentions
        const parts = content.split(/(@\w+(?:\s\w+)*)/g);
        return (
            <>
                {parts.map((part, i) => {
                    if (part.startsWith('@')) {
                        const mentionName = part.slice(1);
                        const isMentioned = group.members?.some(
                            (m) => m.name.toLowerCase() === mentionName.toLowerCase() &&
                                   mentions?.includes(m.id)
                        );
                        if (isMentioned) {
                            return (
                                <span key={i} className="rounded bg-[rgba(136,22,28,0.12)] px-1 font-semibold text-brand-primary">
                                    {part}
                                </span>
                            );
                        }
                    }
                    return <span key={i}>{part}</span>;
                })}
            </>
        );
    }, [group.members]);

    // Duplicate handleSubmit removed in this patch to keep a single submission path (early block remains)

    const handleCloseSession = useCallback(async () => {
        if (sessionClosed || isClosingSession) return;

        setIsClosingSession(true);
        setCloseSessionError(null);

        try {
            const response = await fetch(`/student/courses/${course.id}/session-discussions/${sessionDiscussion.id}/close`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.message || 'Gagal menutup sesi diskusi');
            }

            // Capture summary from close response (Core API returns it inline)
            const responseData = await response.json().catch(() => null);
            const summaryText = responseData?.data?.summary;
            const summaryError = responseData?.data?.summaryError;

            const parsedSummary = parseSummaryText(summaryText, sessionDiscussion.id);
            if (parsedSummary) {
                setInitialSummary(parsedSummary);
            } else if (summaryError) {
                // Auto-retry: regenerate summary when initial generation failed
                console.warn('Summary generation failed during close, auto-retrying:', summaryError);
                setToastMessage({ message: 'Ringkasan sedang dibuat ulang...', type: 'info' });

                try {
                    const retryResponse = await fetch(`/student/courses/${course.id}/session-discussions/${sessionDiscussion.id}/regenerate-summary`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                        },
                    });

                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json().catch(() => null);
                        const parsedRetry = parseSummaryText(retryData?.data?.summary, sessionDiscussion.id, retryData?.data?.generatedAt);
                        if (parsedRetry) {
                            setInitialSummary(parsedRetry);
                            setToastMessage({ message: 'Ringkasan berhasil dibuat!', type: 'success' });
                        } else {
                            setToastMessage({ message: 'Ringkasan tidak tersedia. Silakan coba lagi nanti.', type: 'error' });
                        }
                    } else {
                        setToastMessage({ message: 'Gagal membuat ringkasan. Silakan coba lagi nanti.', type: 'error' });
                    }
                } catch (retryError) {
                    console.error('Summary retry failed:', retryError);
                    setToastMessage({ message: 'Gagal membuat ringkasan. Silakan coba lagi nanti.', type: 'error' });
                }
            }

            // Close the confirmation modal on successful session close.
            // The socket 'session_closed' event will update the UI (setSessionClosed, show summary, etc.),
            // but the local modal state must be cleared here.
            setShowCloseConfirmModal(false);
            restoreFocusToTrigger();

            if (hasGoal && goal?.content) {
                setAiSummaryLoading(true);
                setShowAiSummaryModal(true);

                const summaryMessages = messages.map((m) => ({
                    content: m.content,
                    senderName: m.sender_name || 'Unknown',
                }));

                const stats = {
                    totalMessages: messages.length,
                    participantCount: new Set(messages.map((m) => m.sender_id)).size,
                };

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                };
                if (jwtToken) {
                    headers.Authorization = `Bearer ${jwtToken}`;
                }

                fetch('/api/discussion-direction/summary', {
                    method: 'POST',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify({
                        messages: summaryMessages,
                        goal: goal.content,
                        stats,
                    }),
                })
                    .then(async (res) => {
                        if (!res.ok) {
                            const errBody = await res.json().catch(() => null);
                            throw new Error(errBody?.message || `HTTP ${res.status}`);
                        }
                        return res.json();
                    })
                    .then((data) => {
                        if (data?.data) {
                            setAiSummary(data.data);
                        } else {
                            setAiSummary({
                                goalAchieved: false,
                                topics: [],
                                contributions: {},
                                assessment:
                                    'Penilaian tujuan tidak tersedia. Coba tutup ulang sesi atau hubungi dosen jika masalah berlanjut.',
                            });
                        }
                    })
                    .catch((err) => {
                        console.error('Failed to generate AI summary', err);
                        setAiSummary({
                            goalAchieved: false,
                            topics: [],
                            contributions: {},
                            assessment:
                                'Penilaian tujuan gagal dimuat (autentikasi/layanan AI). Ringkasan diskusi di atas tetap tersedia.',
                        });
                        toast.error('Gagal membuat penilaian tujuan AI');
                    })
                    .finally(() => {
                        setAiSummaryLoading(false);
                    });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal menutup sesi diskusi';
            showCloseError(message);
        } finally {
            setIsClosingSession(false);
        }
    }, [sessionClosed, isClosingSession, course.id, sessionDiscussion.id, showCloseError, restoreFocusToTrigger, hasGoal, goal, messages, jwtToken]);

    const handleOpenCloseConfirmModal = useCallback(() => {
        if (sessionClosed || isClosingSession) return;
        setShowCloseConfirmModal(true);
    }, [sessionClosed, isClosingSession]);

    const closeRightSidebar = useCallback(() => {
        setShowRightSidebar(false);
        restoreFocusToTrigger();
    }, [restoreFocusToTrigger]);

    const openRightSidebar = useCallback((trigger: HTMLElement | null) => {
        rememberTrigger(trigger);
        setShowRightSidebar(true);
    }, [rememberTrigger]);

    const closeReflectionModal = useCallback(() => {
        setShowReflectionModal(false);
        restoreFocusToTrigger();
    }, [restoreFocusToTrigger]);

    const openReflectionModal = useCallback((trigger: HTMLElement | null) => {
        rememberTrigger(trigger);
        setShowReflectionModal(true);
    }, [rememberTrigger]);

    const closeCloseConfirmModal = useCallback(() => {
        setShowCloseConfirmModal(false);
        restoreFocusToTrigger();
    }, [restoreFocusToTrigger]);

    const openCloseConfirmModal = useCallback((trigger: HTMLElement | null) => {
        rememberTrigger(trigger);
        handleOpenCloseConfirmModal();
    }, [handleOpenCloseConfirmModal, rememberTrigger]);

    const handleReply = useCallback((message: DisplayMessage) => {
        setReplyingTo({
            messageId: message.id,
            senderId: message.sender_id,
            senderName: message.sender_name,
            content: message.content,
        });
        inputRef.current?.focus();
    }, []);

    const handleDelete = useCallback(async (messageId: string) => {
        const message = messages.find((m) => m.id === messageId);
        if (!message) return;

        if (window.confirm('Hapus pesan ini? Tindakan tidak dapat dibatalkan.')) {
            try {
                await axios.delete(`/api/chat/messages/${messageId}`, {
                    data: {
                        conversation_id: sessionDiscussion.id,
                        content: message.content,
                    },
                });

                emitDeleteMessage(messageId);

                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageId
                            ? { ...msg, content: '[Pesan telah dihapus]', is_deleted: true, deleted_at: new Date().toISOString() }
                            : msg
                    )
                );

                setToastMessage({ message: 'Pesan berhasil dihapus', type: 'success' });
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.data?.message) {
                    setToastMessage({ message: error.response.data.message, type: 'error' });
                } else {
                    setToastMessage({ message: 'Gagal menghapus pesan', type: 'error' });
                }
            }
        }
    }, [messages, sessionDiscussion.id, emitDeleteMessage]);

    const handleEdit = useCallback((messageId: string) => {
        setEditingMessageId(messageId);
    }, []);

    const handleSaveEdit = useCallback(async (newContent: string) => {
        if (!editingMessageId) return;

        const message = messages.find((m) => m.id === editingMessageId);
        if (!message) return;

        setIsEditingSaving(true);

        try {
            const response = await axios.patch(`/api/chat/messages/${editingMessageId}/edit`, {
                content: newContent,
                conversation_id: sessionDiscussion.id,
                old_content: message.content,
                version: message.version ?? 0,
            });

            if (response.data.success) {
                emitEditMessage(editingMessageId, newContent, response.data.data.edited_at);

                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === editingMessageId
                            ? { ...msg, content: newContent, edited_at: response.data.data.edited_at, version: response.data.data.version }
                            : msg
                    )
                );

                setEditingMessageId(null);
                setToastMessage({ message: 'Pesan berhasil diedit', type: 'success' });
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                const serverVersion = error.response.data.current_version;
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === editingMessageId
                            ? { ...msg, version: serverVersion }
                            : msg
                    )
                );
                setToastMessage({ message: 'Pesan telah diedit oleh pihak lain. Silakan coba lagi.', type: 'error' });
            } else if (axios.isAxiosError(error) && error.response?.data?.message) {
                setToastMessage({ message: error.response.data.message, type: 'error' });
            } else {
                setToastMessage({ message: 'Gagal mengedit pesan', type: 'error' });
            }
        } finally {
            setIsEditingSaving(false);
        }
    }, [editingMessageId, messages, sessionDiscussion.id, emitEditMessage]);

    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
    }, []);

    const handlePin = useCallback(async (messageId: string) => {
        const message = messages.find((m) => m.id === messageId);
        if (!message) return;

        try {
            await pinMessageApi(messageId, message.content, message.sender_name);
            setToastMessage({ message: 'Pesan berhasil disematkan', type: 'success' });
        } catch (error) {
            if (error instanceof Error) {
                setToastMessage({ message: error.message, type: 'error' });
            }
        }
    }, [messages, pinMessageApi]);

    const handleUnpin = useCallback(async (messageId: string) => {
        try {
            await unpinMessageApi(messageId);
            setToastMessage({ message: 'Sematan pesan berhasil dihapus', type: 'success' });
        } catch (error) {
            if (error instanceof Error) {
                setToastMessage({ message: error.message, type: 'error' });
            }
        }
    }, [unpinMessageApi]);

    const handleCopyMessage = useCallback((content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setToastMessage({ message: 'Teks pesan disalin', type: 'success' });
        });
    }, []);

    const cancelReply = useCallback(() => {
        setReplyingTo(null);
    }, []);

    // Submit session reflection
    const handleSubmitReflection = async () => {
        if (!reflectionContent.trim() || reflectionContent.length < 50) {
            setReflectionError('Refleksi minimal 50 karakter');
            return;
        }

        setIsSubmittingReflection(true);
        setReflectionError(null);

        try {
            const response = await fetch(`/student/courses/${course.id}/session-discussions/${sessionDiscussion.id}/reflection`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({ content: reflectionContent }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Gagal mengirim refleksi');
            }

            setHasSubmittedReflection(true);
            closeReflectionModal();
            setReflectionContent('');
        } catch (error) {
            setReflectionError(error instanceof Error ? error.message : 'Terjadi kesalahan');
        } finally {
            setIsSubmittingReflection(false);
        }
    };

    const ownUserId = auth.user?.id;
    const isOwnMessage = useCallback((message: DisplayMessage) => message.sender_id === ownUserId, [ownUserId]);

    // Injected helpers for sending messages exist in the early block; remove the duplicate here

    const breadcrumbItems = [
        { label: 'Kelas', href: student.courses.index.url() },
        { label: course.name, href: student.courses.show.url(course.id) },
        { label: group.name, href: student.groups.show.url(group.id) },
        { label: sessionDiscussion.name },
    ];

    return (
        <AppLayout title={`${sessionDiscussion.name} - ${group.name}`} navItems={navItems}>
            <Head title={`${sessionDiscussion.name} - ${course.name}`} />
            <Breadcrumbs items={breadcrumbItems} />
            <ConnectionBanner status={connectionStatus} />
            {toastMessage && (
                <Toast
                    message={toastMessage.message}
                    type={toastMessage.type}
                    onDismiss={() => setToastMessage(null)}
                />
            )}

            <div className="flex h-[calc(100vh-5rem)] min-h-0 gap-4 overflow-hidden sm:h-[calc(100vh-6rem)] lg:h-[calc(100vh-5rem)]" style={{ paddingBottom: 'var(--safe-bottom)' }}>
                {/* Main Chat Area */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    {/* Chat Header */}
                    <LiquidGlassCard intensity="light" className="mb-4 p-4" lightMode={true}>
                        <div className="flex items-center justify-between">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div 
                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                    style={{ 
                                        background: 'rgba(136,22,28,0.08)', 
                                        border: '1px solid rgba(136,22,28,0.12)' 
                                    }}
                                >
                                    <MessageSquare className="h-5 w-5 text-brand-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-semibold" style={headingStyle}>
                                        {group.name}
                                    </h2>
                                    <p className="truncate text-sm text-brand-muted-dark">
                                        {sessionDiscussion.name} • {course.name}
                                    </p>
                                    {sessionDiscussion.weekTitle && (
                                        <p className="truncate text-xs font-medium text-brand-primary">
                                            {sessionDiscussion.weekIndex != null ? `Minggu ${sessionDiscussion.weekIndex}: ` : ''}
                                            {sessionDiscussion.weekTitle}
                                        </p>
                                    )}
                                    {sessionClosed && (
                                        <span 
                                            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                                            style={{ 
                                                background: 'rgba(107,114,128,0.15)', 
                                                color: 'var(--color-brand-muted-dark)',
                                                border: '1px solid rgba(107,114,128,0.2)',
                                            }}
                                        >
                                            <Lock className="h-3 w-3" />
                                            Sesi Ditutup
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                                <SearchBar
                                    onSearch={performLocalSearch}
                                    onClear={combinedClearSearch}
                                    isSearching={localSearchLoading}
                                    resultCount={localSearchTotal}
                                    isActive={localSearchActive}
                                />
                                {/* Online Users Avatars - compact */}
                                {isConnected && onlineUsers.length > 0 && (
                                    <div className="flex -space-x-2">
                                        {onlineUsers.slice(0, 2).map((user, index) => (
                                            <div
                                                key={user.odId}
                                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-brand-primary"
                                                style={{ 
                                                    zIndex: 3 - index,
                                                    background: 'rgba(136,22,28,0.1)',
                                                }}
                                                title={user.userName}
                                            >
                                                {user.userName.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                        {onlineUsers.length > 2 && (
                                            <div 
                                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-brand-muted-dark"
                                                style={{ background: 'rgba(107,114,128,0.15)' }}
                                            >
                                                +{onlineUsers.length - 2}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Close Session Button */}
                                {!sessionClosed && (
                                    <button
                                        type="button"
                                        onClick={(event) => openCloseConfirmModal(event.currentTarget)}
                                        disabled={isClosingSession}
                                        className="hidden items-center gap-1.5 rounded-xl border border-white/50 px-3 py-2 text-xs font-medium text-brand-dark transition-colors hover:bg-white/50 disabled:opacity-50 sm:flex"
                                        style={{ background: 'rgba(255,255,255,0.4)' }}
                                    >
                                        <Lock className="h-3.5 w-3.5" />
                                        {isClosingSession ? 'Menutup...' : 'Tutup Sesi'}
                                    </button>
                                )}
                                {/* Mobile: Toggle right sidebar */}
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        if (showRightSidebar) {
                                            closeRightSidebar();
                                            return;
                                        }

                                        openRightSidebar(event.currentTarget);
                                    }}
                                    className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-brand-muted-dark transition-colors hover:bg-white/50 lg:hidden"
                                    style={{ background: 'rgba(255,255,255,0.4)' }}
                                    aria-label="Buka detail grup"
                                    aria-expanded={showRightSidebar}
                                    aria-haspopup="dialog"
                                >
                                    <Users className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                    </LiquidGlassCard>

                    {isSummaryVisible && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                            <ChatSummaryCard state={summaryState} onOpenDetail={() => {}} onRetry={retrySummary} />
                        </motion.div>
                    )}

                    <div className="relative">
<PinnedMessages
                        pinnedMessages={pinnedMessages}
                        onUnpin={handleUnpin}
                        onMessageClick={scrollToSearchResult}
                        canPin={auth.user?.role !== 'student'}
                        canUnpin={auth.user?.role !== 'student'}
                    />

                        <AnimatePresence>
                            {localSearchActive && (
                                <SearchResults
                                    results={localSearchResults}
                                    hasMore={false}
                                    isLoading={localSearchLoading}
                                    totalResults={localSearchTotal}
                                    onResultClick={scrollToSearchResult}
                                    onLoadMore={() => {}}
                                    onClose={combinedClearSearch}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence>
                        {closeSessionError && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="mb-4"
                            >
                                <LiquidGlassCard intensity="light" className="border-l-4 border-red-500 p-3" lightMode={true}>
                                    <p className="text-sm text-red-700">{closeSessionError}</p>
                                </LiquidGlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Goal Banner - Set Goal Prompt */}
                    <AnimatePresence>
                        {showGoalBanner && !hasGoal && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 overflow-hidden"
                            >
                                <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div 
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                                style={{ 
                                                    background: 'rgba(245,158,11,0.1)', 
                                                    border: '1px solid rgba(245,158,11,0.2)' 
                                                }}
                                            >
                                                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-brand-dark" style={headingStyle}>
                                                    Tetapkan tujuan pembelajaran Anda
                                                </p>
                                                <p className="mt-0.5 text-sm text-brand-muted-dark">
                                                    Bantu fokus diskusi dengan menetapkan tujuan SMART untuk sesi ini.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={student.goals.create.url({ course: course.id, sessionDiscussion: sessionDiscussion.id })}
                                                className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                                                style={{ 
                                                    background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                    boxShadow: '0 8px 32px rgba(136,22,28,0.4)',
                                                }}
                                            >
                                                Tetapkan
                                            </Link>
                                            <button
                                                onClick={() => setShowGoalBanner(false)}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl text-brand-muted-dark transition-colors hover:bg-white/50"
                                                style={{ background: 'rgba(255,255,255,0.4)' }}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </LiquidGlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {sessionClosed && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4"
                        >
                            <LiquidGlassCard 
                                intensity="light" 
                                className={`p-4 ${hasSubmittedReflection ? 'border-l-4 border-green-500' : 'border-l-4 border-purple-500'}`} 
                                lightMode={true}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        {hasSubmittedReflection ? (
                                            <div 
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                                            >
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                            </div>
                                        ) : (
                                            <div 
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
                                            >
                                                <Lock className="h-5 w-5 text-purple-600" />
                                            </div>
                                        )}
                                        <div>
                                            <p className={`font-semibold ${hasSubmittedReflection ? 'text-green-800' : 'text-purple-800'}`} style={headingStyle}>
                                                {hasSubmittedReflection
                                                    ? 'Sesi ini telah ditutup - Refleksi terkirim'
                                                    : sessionClosedMessage || 'Sesi diskusi ini telah ditutup'
                                                }
                                            </p>
                                            <p className={`mt-0.5 text-sm ${hasSubmittedReflection ? 'text-green-700' : 'text-purple-700'}`}>
                                                {hasSubmittedReflection
                                                    ? 'Terima kasih telah mengirimkan refleksi Anda untuk sesi ini.'
                                                    : 'Silakan isi refleksi untuk sesi ini sebelum melanjutkan.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    {!hasSubmittedReflection && (
                                        <button
                                            type="button"
                                            onClick={(event) => openReflectionModal(event.currentTarget)}
                                            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                                            style={{ 
                                                background: 'linear-gradient(135deg, rgba(168,85,247,0.92) 0%, rgba(147,51,234,0.96) 100%)',
                                                boxShadow: '0 8px 32px rgba(168,85,247,0.4)',
                                            }}
                                        >
                                            Isi Refleksi
                                        </button>
                                    )}
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    )}

                    {/* Connection Error Banner */}
                    {connectionError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4"
                        >
                            <LiquidGlassCard intensity="light" className="border-l-4 border-red-500 p-3" lightMode={true}>
                                <div className="flex items-center gap-2">
                                    <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="truncate text-sm text-red-700">{connectionError}</span>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    )}

                    {/* Messages Container */}
                    <LiquidGlassCard intensity="medium" className="relative min-h-0 flex-1 overflow-hidden p-4" lightMode={true}>
                        <DropZoneOverlay isDragging={isDragging && !sessionClosed} />
                        <div className="flex h-full flex-col">
                            <div
                                {...dragProps}
                                ref={messagesContainerRef}
                                role="log"
                                aria-live="polite"
                                aria-label="Daftar pesan chat"
                                className={`chat-messages-scroll scrollbar-stable min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 ${isScrolling ? 'is-scrolling' : ''}`}
                                style={{ paddingBottom: keyboardVisible ? '8rem' : '5.5rem' }}
                            >
                                <LayoutGroup>
                                    <div className="space-y-1">
                                        {isInitialMessagesLoading && messages.length === 0 ? (
                                            <ChatSkeleton messageCount={5} />
                                        ) : (
                                        <>
                                        {hasMoreMessages && messages.length > 0 && (
                                            <div className="mb-2 flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => loadMoreMessages(sessionDiscussion.id, messages[0].id)}
                                                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                                >
                                                    Muat pesan lebih lama
                                                </button>
                                            </div>
                                        )}
                                        {isVirtualized && (
                                            <div className="mb-2 flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={showAllMessages}
                                                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                                >
                                                    Tampilkan {hiddenCount} pesan sebelumnya
                                                </button>
                                            </div>
                                        )}
                                        <AnimatePresence initial={false}>
                                            {visibleMessages.map((message) => {
                                                const isOwner = isOwnMessage(message);
                                                const isPinnedMsg = pinnedMessages.some((p) => p.message_id === message.id);
                                                const editTimeLimit = new Date(message.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
                                                const userRole = auth.user?.role;
                                                const canPinMessages = userRole !== 'student';

                                                return (
                                                    <MessageItem
                                                        key={message.id}
                                                        message={message}
                                                        ownMessage={isOwner}
                                                        renderMessageContent={renderMessageContent}
                                                        onReply={handleReply}
                                                        onDelete={handleDelete}
                                                        onRetry={handleRetryMessage}
                                                        onOpenImagePreview={openImagePreview}
                                                        onDownloadAttachment={downloadImage}
                                                        onOpenCitation={openCitation}
                                                        materialIndex={materialIndex}
                                                        onEdit={handleEdit}
                                                        onPin={handlePin}
                                                        onUnpin={handleUnpin}
                                                        onCopy={handleCopyMessage}
                                                        canPin={canPinMessages}
                                                        isPinned={isPinnedMsg}
                                                        isEditing={editingMessageId === message.id}
                                                        editingContent={message.content}
                                                        onSaveEdit={handleSaveEdit}
                                                        onCancelEdit={handleCancelEdit}
                                                        isSavingEdit={isEditingSaving}
                                                        isHighlighted={searchHighlightId === message.id}
                                                        canEdit={isOwner && editTimeLimit}
                                                    />
                                                );
                                            })}
                                        </AnimatePresence>

                                        {/* Typing Indicator - with smooth layout animation */}
                                        <AnimatePresence mode="popLayout">
                                            {typingUsers.length > 0 && (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                                    transition={{ 
                                                        duration: 0.3,
                                                        ease: 'easeInOut',
                                                        layout: { duration: 0.2 }
                                                    }}
                                                    className="mt-3 flex items-center gap-2 overflow-hidden"
                                                >
                                                    <motion.div 
                                                        className="flex items-center gap-1 rounded-full px-3 py-2"
                                                        style={{ background: 'rgba(107,114,128,0.1)' }}
                                                        initial={{ scale: 0.8 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0.8 }}
                                                    >
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-brand-muted-dark)]" style={{ animationDelay: '0ms' }} />
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-brand-muted-dark)]" style={{ animationDelay: '150ms' }} />
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-brand-muted-dark)]" style={{ animationDelay: '300ms' }} />
                                                    </motion.div>
                                                    <motion.span 
                                                        className="text-xs text-brand-muted-dark"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                    >
                                                        {typingUsers.join(', ')} sedang mengetik...
                                                    </motion.span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        </>
                                        )}
                                    </div>
                                </LayoutGroup>
                            </div>

                            {/* Message Input */}
                            <div
                                className="fixed inset-x-0 bottom-0 z-30 border-t border-white/50 bg-white/85 px-3 pt-3 pb-3 shadow-[0_-12px_32px_rgba(136,22,28,0.12)] backdrop-blur-xl md:static md:z-auto md:mt-4 md:border-t md:bg-transparent md:px-0 md:pt-4 md:pb-0 md:shadow-none"
                                style={{
                                    paddingBottom: `calc(var(--safe-bottom) + ${keyboardVisible ? '0.75rem' : '0.5rem'})`,
                                    left: 'max(var(--safe-left), 0px)',
                                    right: 'max(var(--safe-right), 0px)',
                                }}
                            >
                                {/* Reply Preview */}
                                <AnimatePresence>
                                    {replyingTo && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-2 flex items-center justify-between rounded-xl border-l-4 border-brand-primary px-3 py-2"
                                            style={{ background: 'rgba(136,22,28,0.06)' }}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <CornerUpLeft className="hidden h-4 w-4 flex-shrink-0 text-brand-primary sm:block" />
                                                <div className="min-w-0">
                                                    <span className="text-xs font-medium text-brand-primary">
                                                        Membalas {replyingTo.senderName}
                                                    </span>
                                                    <p className="truncate text-xs text-brand-muted-dark">{replyingTo.content}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={cancelReply}
                                                className="touch-target ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-brand-muted-dark transition-colors hover:bg-white/50"
                                                aria-label="Tutup"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Pending Files Preview */}
                                <AnimatePresence>
                                    {pendingFiles.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-2 flex flex-wrap gap-1.5 sm:mb-3 sm:gap-2"
                                        >
                                            {pendingFiles.map((pf) => (
                                                <motion.div
                                                    key={pf.id}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="relative"
                                                >
                                                    {pf.preview ? (
                                                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/50 sm:h-20 sm:w-20">
                                                            <img src={pf.preview} alt={pf.file.name} className="h-full w-full object-cover" loading="lazy" />
                                                            <button
                                                                type="button"
                                                                onClick={() => removePendingFile(pf.id)}
                                                                className="touch-target absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                                                                aria-label="Tutup"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative flex items-center gap-1.5 rounded-xl border border-white/50 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2" style={{ background: 'rgba(255,255,255,0.5)' }}>
                                                            <svg className="h-4 w-4 text-brand-muted-dark sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <div className="max-w-[80px] sm:max-w-[100px]">
                                                                <p className="truncate text-xs font-medium text-brand-dark">{pf.file.name}</p>
                                                                <p className="text-xs text-brand-muted-dark">{formatFileSize(pf.file.size)}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removePendingFile(pf.id)}
                                                                className="touch-target ml-1 flex h-6 w-6 items-center justify-center rounded text-brand-muted-dark transition-colors hover:bg-white/50"
                                                                aria-label="Tutup"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Mention Suggestions Popup */}
                                <AnimatePresence>
                                    {showMentionList && filteredMembers.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            role="menu"
                                            aria-label="Saran mention"
                                            className="mb-2 max-h-32 overflow-y-auto rounded-xl border border-white/50 bg-white/90 shadow-lg backdrop-blur-sm sm:max-h-40"
                                        >
                                            {filteredMembers.map((member, index) => (
                                                <button
                                                    key={member.id}
                                                    type="button"
                                                    onClick={() => insertMention(member)}
                                                    role="menuitem"
                                                    className={`touch-target flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                                                        index === selectedMentionIndex
                                                            ? 'bg-[rgba(136,22,28,0.08)]'
                                                            : 'hover:bg-[rgba(107,114,128,0.08)]'
                                                    }`}
                                                >
                                                    {'isAI' in member && member.isAI ? (
                                                        // AI Avatar
                                                        <div 
                                                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8"
                                                            style={{ background: 'linear-gradient(135deg, var(--color-brand-primary) 0%, #a41219 100%)', border: '1px solid rgba(255,255,255,0.2)' }}
                                                        >
                                                            <svg className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    ) : (
                                                        // Member Avatar
                                                        <div 
                                                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8"
                                                            style={{ background: 'rgba(136,22,28,0.08)' }}
                                                        >
                                                            <span className="text-xs font-bold text-brand-primary sm:text-sm">
                                                                {member.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`truncate text-sm font-medium ${'isAI' in member && member.isAI ? 'text-brand-primary' : 'text-brand-dark'}`}>
                                                            {'isAI' in member && member.isAI ? '@AI' : member.name}
                                                        </p>
                                                        <p className="hidden truncate text-xs text-brand-muted-dark sm:block">{member.email}</p>
                                                    </div>
                                                    {'isAI' in member && member.isAI && (
                                                        <span 
                                                            className="hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline-block"
                                                            style={{ background: 'rgba(136,22,28,0.1)', color: 'var(--color-brand-primary)' }}
                                                        >
                                                            Asisten
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSubmit} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={newMessage}
                                            onChange={handleInputChange}
                                            onBlur={handleInputBlur}
                                            onKeyDown={handleKeyDown}
                                            placeholder={
                                                sessionClosed
                                                    ? "Sesi telah ditutup"
                                                    : replyingTo
                                                    ? `Balas ${replyingTo.senderName}...`
                                                    : "Ketik @ untuk menyebut..."
                                            }
                                            disabled={sessionClosed}
                                            className="h-11 w-full rounded-xl border border-white/50 bg-white/60 px-4 text-sm text-brand-dark placeholder-[#9CA3AF] shadow-brand-sm outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-[rgba(136,22,28,0.1)] disabled:cursor-not-allowed sm:text-base"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || !isConnected || isUploading || sessionClosed}
                                        className="touch-target flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                            boxShadow: '0 8px 32px rgba(136,22,28,0.4)',
                                        }}
                                        title={sessionClosed ? "Sesi telah ditutup" : "Kirim pesan"}
                                        aria-label="Kirim pesan"
                                    >
                                        {isUploading ? (
                                            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        ) : (
                                            <>
                                                <span className="hidden sm:mr-1 sm:inline text-sm font-medium">Kirim</span>
                                                <Send className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                                <p className="mt-2 text-center text-xs text-brand-muted-dark">
                                    Tips: Sebut <span className="font-medium text-brand-primary">@ai</span> untuk bertanya kepada Asisten AI.
                                </p>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </div>

                {/* Right Sidebar - Desktop */}
                <aside className="hidden w-72 flex-shrink-0 flex-col gap-4 overflow-y-auto lg:flex">
                    {/* Discussion Quality Feedback - AI Analytics */}
                    <AnimatePresence>
                        {discussionQuality && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <LiquidGlassCard 
                                    intensity="light" 
                                    className={`p-4 ${
                                        discussionQuality.qualityScore >= 70
                                            ? 'border-l-4 border-green-500'
                                            : discussionQuality.qualityScore >= 40
                                              ? 'border-l-4 border-amber-500'
                                              : 'border-l-4 border-red-500'
                                    }`} 
                                    lightMode={true}
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-brand-primary" />
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted-dark">
                                                Kualitas Diskusi
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => setQualityPanelExpanded(!qualityPanelExpanded)}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-muted-dark transition-colors hover:bg-white/50"
                                        >
                                            <svg className={`h-4 w-4 transition-transform ${qualityPanelExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    {/* Quality Score */}
                                    <div className="mb-3 flex items-center gap-3">
                                        <div 
                                            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                                                discussionQuality.qualityScore >= 70
                                                    ? 'text-white'
                                                    : discussionQuality.qualityScore >= 40
                                                      ? 'text-white'
                                                      : 'text-white'
                                            }`}
                                            style={{
                                                background: discussionQuality.qualityScore >= 70
                                                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                    : discussionQuality.qualityScore >= 40
                                                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                            }}
                                        >
                                            {Math.round(discussionQuality.qualityScore)}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${
                                                discussionQuality.qualityScore >= 70
                                                    ? 'text-green-700'
                                                    : discussionQuality.qualityScore >= 40
                                                      ? 'text-amber-700'
                                                      : 'text-red-700'
                                            }`}>
                                                {discussionQuality.qualityScore >= 70
                                                    ? 'Diskusi Berkualitas!'
                                                    : discussionQuality.qualityScore >= 40
                                                      ? 'Terus Tingkatkan'
                                                      : 'Perlu Perhatian'}
                                            </p>
                                            <p className="text-xs text-brand-muted-dark">HOT: {discussionQuality.hotPercentage.toFixed(1)}%</p>
                                        </div>
                                    </div>

                                    {/* Engagement Types - Collapsible */}
                                    <AnimatePresence>
                                        {showQualityFeedback && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="space-y-2 border-t border-white/50 pt-3">
                                                    <p className="text-xs font-medium text-brand-dark">Tipe Keterlibatan:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {Object.entries(discussionQuality.engagementTypes).map(([type, count]) => (
                                                            <span
                                                                key={type}
                                                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                                                style={{
                                                                    background: type === 'Cognitive'
                                                                        ? 'rgba(59,130,246,0.1)'
                                                                        : type === 'Behavioral'
                                                                          ? 'rgba(168,85,247,0.1)'
                                                                          : 'rgba(236,72,153,0.1)',
                                                                    color: type === 'Cognitive'
                                                                        ? '#2563eb'
                                                                        : type === 'Behavioral'
                                                                          ? '#9333ea'
                                                                          : '#db2777',
                                                                    border: `1px solid ${type === 'Cognitive'
                                                                        ? 'rgba(59,130,246,0.2)'
                                                                        : type === 'Behavioral'
                                                                          ? 'rgba(168,85,247,0.2)'
                                                                          : 'rgba(236,72,153,0.2)'}`,
                                                                }}
                                                            >
                                                                {type === 'Cognitive' ? '🧠' : type === 'Behavioral' ? '⚡' : '💭'}
                                                                {type}: {count}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div 
                                                        className="mt-2 rounded-xl p-3"
                                                        style={{ background: 'rgba(255,255,255,0.5)' }}
                                                    >
                                                        <p className="text-xs text-brand-muted-dark">
                                                            {discussionQuality.qualityScore >= 70
                                                                ? '✨ Luar biasa! Diskusi menunjukkan pemikiran tingkat tinggi.'
                                                                : discussionQuality.qualityScore >= 40
                                                                  ? '💡 Coba ajukan pertanyaan analisis atau evaluasi untuk meningkatkan kualitas.'
                                                                  : '🎯 Gunakan kata-kata seperti "mengapa", "bagaimana jika", atau "bandingkan" untuk diskusi lebih mendalam.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </LiquidGlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* My Goal Section */}
                    {hasGoal && goal && (
                        <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                            <div className="mb-2 flex items-center gap-2">
                                <div 
                                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                                    style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                >
                                    <svg className="h-4 w-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
                                    Tujuan Saya
                                </h3>
                            </div>
                            <p className="text-sm text-brand-dark">
                                {goal.content}
                            </p>
                        </LiquidGlassCard>
                    )}

                    {/* Set Goal Prompt - Desktop */}
                    {!hasGoal && (
                        <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                            <div className="mb-2 flex items-center gap-2">
                                <div 
                                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                                >
                                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                    Belum Ada Tujuan
                                </h3>
                            </div>
                            <p className="mb-3 text-xs text-brand-muted-dark">
                                Tetapkan tujuan untuk membantu fokus diskusi Anda.
                            </p>
                            <Link
                                href={student.goals.create.url({ course: course.id, sessionDiscussion: sessionDiscussion.id })}
                                className="block w-full rounded-xl px-3 py-2 text-center text-xs font-medium text-white transition-opacity hover:opacity-90"
                                style={{ 
                                    background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                    boxShadow: '0 8px 32px rgba(136,22,28,0.4)',
                                }}
                            >
                                Tetapkan Tujuan
                            </Link>
                        </LiquidGlassCard>
                    )}

                    {/* Members Section */}
                    <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted-dark">
                                Anggota
                            </h3>
                            <span className="text-xs text-brand-muted-dark">{group.members?.length || 0}</span>
                        </div>
                        <div className="space-y-2">
                            {group.members?.map((member) => {
                                const isOnline = onlineUsers.some(u => u.odId === member.id);
                                return (
                                    <div key={member.id} className="flex items-center gap-3">
                                        <div className="relative">
                                            <div 
                                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-brand-primary"
                                                style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                            >
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            {isOnline && (
                                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-brand-dark">
                                                {member.name}
                                                {member.id === auth.user?.id && (
                                                    <span className="ml-1 text-xs text-brand-muted-dark">(kamu)</span>
                                                )}
                                            </p>
                                            <p className="truncate text-xs text-brand-muted-dark">
                                                {isOnline ? 'Aktif' : 'Tidak aktif'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </LiquidGlassCard>

                    <ChatWeekMaterialsPanel
                        courseId={course.id}
                        sessionDiscussionId={sessionDiscussion.id}
                        cited={citedMaterials}
                        variant="card"
                        onOpenDocument={(target) => setDocumentViewer(target)}
                    />
                </aside>

                {/* Right Sidebar - Mobile Overlay */}
                <AnimatePresence>
                    {showRightSidebar && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={closeRightSidebar}
                                className="fixed inset-0 z-40 bg-black lg:hidden"
                            />
                            <motion.aside
                                ref={rightSidebarRef}
                                initial={{ x: 288 }}
                                animate={{ x: 0 }}
                                exit={{ x: 288 }}
                                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                                role="dialog"
                                aria-modal="true"
                                aria-label="Detail grup"
                                tabIndex={-1}
                                onKeyDown={(event) => handleDialogKeyDown(event, closeRightSidebar)}
                                className="fixed inset-y-0 right-0 z-50 w-72 overflow-y-auto border-l border-white/50 p-4 lg:hidden"
                                style={{ 
                                    background: 'linear-gradient(135deg, #f5f0f0 0%, #e8e4f0 50%, #f0e8e8 100%)',
                                    paddingTop: 'calc(var(--safe-top) + 1rem)',
                                    paddingRight: 'calc(var(--safe-right) + 1rem)',
                                    paddingBottom: 'calc(var(--safe-bottom) + 1rem)',
                                }}
                            >
                                {/* Close button */}
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="font-semibold text-brand-dark" style={headingStyle}>Detail</h2>
                                    <button
                                        type="button"
                                        onClick={closeRightSidebar}
                                        className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-brand-muted-dark transition-colors hover:bg-white/50"
                                        style={{ background: 'rgba(255,255,255,0.4)' }}
                                        aria-label="Tutup"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Discussion Quality Feedback - Mobile */}
                                {discussionQuality && (
                                    <LiquidGlassCard 
                                        intensity="light" 
                                        className={`mb-4 p-3 ${
                                            discussionQuality.qualityScore >= 70
                                                ? 'border-l-4 border-green-500'
                                                : discussionQuality.qualityScore >= 40
                                                  ? 'border-l-4 border-amber-500'
                                                  : 'border-l-4 border-red-500'
                                        }`} 
                                        lightMode={true}
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-brand-primary" />
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted-dark">
                                                Kualitas Diskusi
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white"
                                                style={{
                                                    background: discussionQuality.qualityScore >= 70
                                                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                        : discussionQuality.qualityScore >= 40
                                                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                                          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                }}
                                            >
                                                {Math.round(discussionQuality.qualityScore)}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${
                                                    discussionQuality.qualityScore >= 70
                                                        ? 'text-green-700'
                                                        : discussionQuality.qualityScore >= 40
                                                          ? 'text-amber-700'
                                                          : 'text-red-700'
                                                }`}>
                                                    {discussionQuality.qualityScore >= 70
                                                        ? 'Diskusi Berkualitas!'
                                                        : discussionQuality.qualityScore >= 40
                                                          ? 'Terus Tingkatkan'
                                                          : 'Perlu Perhatian'}
                                                </p>
                                                <p className="text-xs text-brand-muted-dark">HOT: {discussionQuality.hotPercentage.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {Object.entries(discussionQuality.engagementTypes).map(([type, count]) => (
                                                <span
                                                    key={type}
                                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                                    style={{
                                                        background: type === 'Cognitive'
                                                            ? 'rgba(59,130,246,0.1)'
                                                            : type === 'Behavioral'
                                                              ? 'rgba(168,85,247,0.1)'
                                                              : 'rgba(236,72,153,0.1)',
                                                        color: type === 'Cognitive'
                                                            ? '#2563eb'
                                                            : type === 'Behavioral'
                                                              ? '#9333ea'
                                                              : '#db2777',
                                                    }}
                                                >
                                                    {type === 'Cognitive' ? '🧠' : type === 'Behavioral' ? '⚡' : '💭'}
                                                    {count}
                                                </span>
                                            ))}
                                        </div>
                                    </LiquidGlassCard>
                                )}

                                {/* My Goal Section - Mobile */}
                                {hasGoal && goal && (
                                    <LiquidGlassCard intensity="light" className="mb-4 p-3" lightMode={true}>
                                        <div className="mb-2 flex items-center gap-2">
                                            <div 
                                                className="flex h-8 w-8 items-center justify-center rounded-xl"
                                                style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                            >
                                                <svg className="h-4 w-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
                                                Tujuan Saya
                                            </h3>
                                        </div>
                                        <p className="text-sm text-brand-dark">
                                            {goal.content}
                                        </p>
                                    </LiquidGlassCard>
                                )}

                                {/* Set Goal Prompt - Mobile */}
                                {!hasGoal && (
                                    <LiquidGlassCard intensity="light" className="mb-4 p-3" lightMode={true}>
                                        <div className="mb-2 flex items-center gap-2">
                                            <div 
                                                className="flex h-8 w-8 items-center justify-center rounded-xl"
                                                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                                            >
                                                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                                Belum Ada Tujuan
                                            </h3>
                                        </div>
                                        <p className="mb-3 text-xs text-brand-muted-dark">
                                            Tetapkan tujuan untuk membantu fokus diskusi Anda.
                                        </p>
                                        <Link
                                            href={student.goals.create.url({ course: course.id, sessionDiscussion: sessionDiscussion.id })}
                                            className="block w-full rounded-xl px-3 py-2 text-center text-xs font-medium text-white transition-opacity hover:opacity-90"
                                            style={{ 
                                                background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                boxShadow: '0 8px 32px rgba(136,22,28,0.4)',
                                            }}
                                        >
                                            Tetapkan Tujuan
                                        </Link>
                                    </LiquidGlassCard>
                                )}

                                {/* Members Section */}
                                <div className="mb-6">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted-dark">
                                            Anggota
                                        </h3>
                                        <span className="text-xs text-brand-muted-dark">{group.members?.length || 0}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {group.members?.map((member) => {
                                            const isOnline = onlineUsers.some(u => u.odId === member.id);
                                            return (
                                                <div key={member.id} className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div 
                                                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-brand-primary"
                                                            style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                                        >
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {isOnline && (
                                                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-brand-dark">
                                                            {member.name}
                                                            {member.id === auth.user?.id && (
                                                                <span className="ml-1 text-xs text-brand-muted-dark">(kamu)</span>
                                                            )}
                                                        </p>
                                                        <p className="truncate text-xs text-brand-muted-dark">
                                                            {isOnline ? 'Aktif' : 'Tidak aktif'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <ChatWeekMaterialsPanel
                                    courseId={course.id}
                                    sessionDiscussionId={sessionDiscussion.id}
                                    cited={citedMaterials}
                                    variant="plain"
                                    onOpenDocument={(target) => setDocumentViewer(target)}
                                />
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Image Preview Modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4"
                        onClick={closeImagePreview}
                    >
                        <div
                            ref={imagePreviewDialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label={`Pratinjau gambar ${previewImage.name}`}
                            tabIndex={-1}
                            onKeyDown={(event) => handleDialogKeyDown(event, closeImagePreview)}
                            className="contents"
                        >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={closeImagePreview}
                            className="absolute right-2 top-2 rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20 sm:right-4 sm:top-4 sm:p-2"
                            aria-label="Tutup"
                        >
                            <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>

                        {/* Image name */}
                        <div className="absolute left-2 top-2 max-w-[50%] truncate text-xs text-white/70 sm:left-4 sm:top-4 sm:max-w-none sm:text-sm">
                            {previewImage.name}
                        </div>

                        {/* Zoom controls */}
                        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 px-2 py-1.5 backdrop-blur-sm sm:bottom-4 sm:gap-2 sm:px-4 sm:py-2">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                                disabled={imageZoom <= 0.5}
                                className="rounded-full p-1.5 text-white transition-colors hover:bg-white/20 disabled:opacity-50 sm:p-2"
                                title="Perkecil (-)"
                            >
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                </svg>
                            </button>
                            
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                                className="min-w-[50px] rounded-full px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-white/20 sm:min-w-[60px] sm:px-3 sm:py-1 sm:text-sm"
                                title="Atur ulang zoom (0)"
                            >
                                {Math.round(imageZoom * 100)}%
                            </button>
                            
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                                disabled={imageZoom >= 3}
                                className="rounded-full p-1.5 text-white transition-colors hover:bg-white/20 disabled:opacity-50 sm:p-2"
                                title="Perbesar (+)"
                            >
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                            </button>

                            <div className="mx-1 h-5 w-px bg-white/30 sm:mx-2 sm:h-6" />

                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); downloadImage(previewImage.url, previewImage.name); }}
                                className="rounded-full p-1.5 text-white transition-colors hover:bg-white/20 sm:p-2"
                                title="Unduh gambar"
                            >
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        </div>

                        {/* Image container */}
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="flex max-h-[75vh] max-w-[95vw] items-center justify-center overflow-hidden sm:max-h-[80vh] sm:max-w-[90vw]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={previewImage.url}
                                alt={previewImage.name}
                                className="max-h-[75vh] max-w-[95vw] object-contain transition-transform duration-200 sm:max-h-[80vh] sm:max-w-[90vw]"
                                style={{ transform: `scale(${imageZoom})` }}
                                loading="lazy"
                                draggable={false}
                            />
                        </motion.div>

                        {/* Keyboard shortcuts hint - hidden on mobile */}
                        <div className="absolute bottom-2 right-2 hidden text-xs text-white/50 sm:bottom-4 sm:right-4 sm:block">
                            <span className="rounded bg-white/10 px-1.5 py-0.5">Esc</span> tutup
                            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5">+/-</span> zoom
                            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5">0</span> reset
                        </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Session Reflection Modal */}
            <BaseModal open={showReflectionModal} title="Refleksi Sesi" onClose={() => !isSubmittingReflection && closeReflectionModal()} size="lg" className="w-full max-w-lg rounded-2xl border border-white/50 p-6 shadow-xl" closeOnOverlayClick={!isSubmittingReflection}>
                        <div>
                            <div className="mb-4 flex items-center gap-3">
                                <div 
                                    className="flex h-10 w-10 items-center justify-center rounded-full"
                                    style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
                                >
                                    <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-brand-dark" style={headingStyle}>
                                        Refleksi Sesi
                                    </h3>
                                    <p className="text-sm text-brand-muted-dark">
                                        {sessionDiscussion.name}
                                    </p>
                                </div>
                            </div>

                            <p className="mb-2 text-sm text-brand-muted-dark">
                                {sessionClosedMessage || 'Sesi diskusi ini telah ditutup oleh dosen.'}
                            </p>
                            <p className="mb-4 text-sm text-brand-muted-dark">
                                Silakan refleksikan pembelajaran Anda selama sesi ini:
                            </p>

                            {goal && (
                                <div 
                                    className="mb-4 rounded-xl p-3"
                                    style={{ background: 'rgba(136,22,28,0.06)', border: '1px solid rgba(136,22,28,0.12)' }}
                                >
                                    <p className="text-xs font-medium text-brand-primary">
                                        Tujuan pembelajaran Anda:
                                    </p>
                                    <p className="mt-1 text-sm text-brand-dark">
                                        {goal.content}
                                    </p>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="mb-2 block text-sm font-medium text-brand-dark">
                                    Refleksi Anda <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={reflectionContent}
                                    onChange={(e) => setReflectionContent(e.target.value)}
                                    placeholder="Bagaimana pembelajaran Anda selama sesi ini? Apa yang sudah dipahami? Apa yang masih perlu dipelajari?"
                                    rows={5}
                                    className="w-full resize-none rounded-xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-brand-dark placeholder-[#9CA3AF] outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-[rgba(136,22,28,0.1)] disabled:cursor-not-allowed"
                                    disabled={isSubmittingReflection}
                                />
                                <div className="mt-1 flex items-center justify-between">
                                    <p className={`text-xs ${
                                        reflectionContent.length < 50
                                            ? 'text-brand-muted-dark'
                                            : 'text-green-600'
                                    }`}>
                                        {reflectionContent.length}/50 karakter minimum
                                    </p>
                                    {reflectionError && (
                                        <p className="text-xs text-red-500">{reflectionError}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeReflectionModal}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-brand-muted-dark transition-colors hover:bg-white/50"
                                    disabled={isSubmittingReflection}
                                >
                                    Nanti
                                </button>
                                <button
                                    onClick={handleSubmitReflection}
                                    disabled={isSubmittingReflection || reflectionContent.length < 50}
                                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                    style={{ 
                                        background: 'linear-gradient(135deg, rgba(168,85,247,0.92) 0%, rgba(147,51,234,0.96) 100%)',
                                        boxShadow: '0 8px 32px rgba(168,85,247,0.4)',
                                    }}
                                >
                                    {isSubmittingReflection ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Mengirim...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Kirim Refleksi</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
            </BaseModal>

            {/* Close Session Confirmation Modal */}
            <ConfirmDialog
                open={showCloseConfirmModal}
                title="Tutup Sesi Diskusi?"
                message={`Anda akan menutup sesi diskusi "${sessionDiscussion.name}". Setelah ditutup, anggota grup tidak dapat mengirim pesan lagi sampai dosen membuka kembali sesi ini.`}
                confirmLabel={isClosingSession ? 'Menutup...' : 'Ya, Tutup Sesi'}
                cancelLabel="Batal"
                onConfirm={handleCloseSession}
                onCancel={closeCloseConfirmModal}
                variant="warning"
            />

            {/* AI Discussion Direction Summary Modal (NFR-USABILITY-04) */}
            {showAiSummaryModal && (
                <SessionSummaryModal
                    goalAchieved={aiSummary?.goalAchieved ?? false}
                    topics={aiSummary?.topics ?? []}
                    contributions={aiSummary?.contributions ?? {}}
                    assessment={aiSummary?.assessment ?? ''}
                    isLoading={aiSummaryLoading}
                    onClose={() => setShowAiSummaryModal(false)}
                    goal={goal?.content ?? null}
                />
            )}

            <DocumentViewerModal
                open={documentViewer !== null}
                target={documentViewer}
                onClose={() => setDocumentViewer(null)}
            />
        </AppLayout>
    );
}
