import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Menu, MessageSquare, Pencil, Plus, Send, Sparkles, Trash2, X, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { ChatSkeleton } from '@/components/ui/skeletons';
import { AiMessage, SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { formatAiOutput } from '@/lib/formatAiOutput';
import { getAuthToken } from '@/lib/getAuthToken';
import { fetchChatMessages } from '@/lib/fetchChatMessages';
import { sanitizeHtml } from '@/lib/sanitize';

const getCoreApiUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:3000`;
    }
    return 'http://localhost:3000';
};
import student from '@/routes/student';
import { useStudentNav } from '@/components/navigation/student-nav';
import AppLayout from '@/layouts/app-layout';

interface AiChat {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages?: AiMessage[];
}

interface Props {
    chats: AiChat[];
    activeChat: AiChat | null;
}

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const bodyTextClass = 'text-sm text-[#4B5563]';

const emptyStateCards = [
    {
        icon: MessageSquare,
        eyebrow: 'Mulai Cepat',
        title: 'Bantu pecahkan ide, umpan balik, dan tugas jadi lebih terarah.',
        prompt: 'Bantu saya menyusun ide utama untuk tugas saya dan beri langkah pengerjaannya.',
    },
    {
        icon: Sparkles,
        eyebrow: 'Kolaborasi AI',
        title: 'Diskusikan materi, minta ringkasan, lalu rapikan pemahaman Anda lebih cepat.',
        prompt: 'Ringkas materi yang sedang saya pelajari lalu jelaskan poin paling pentingnya.',
    },
    {
        icon: CalendarDays,
        eyebrow: 'Perencanaan',
        title: 'Atur prioritas belajar, pecah target mingguan, dan tetap fokus pada progres.',
        prompt: 'Bantu saya membuat rencana belajar mingguan yang realistis untuk mata kuliah saya.',
    },
] as const;


export default function AiChatIndex({ chats, activeChat }: Props) {
    const { auth: authData } = usePage<SharedData>().props;
    const pageProps = usePage<SharedData>().props as SharedData & {
        errors?: Record<string, string>;
        flash?: {
            success?: string;
            error?: string;
        };
    };
    const [jwtToken, setJwtToken] = useState('');
    const navItems = useStudentNav('ai-chat');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [displayedStreamingContent, setDisplayedStreamingContent] = useState('');
    const [optimisticMessages, setOptimisticMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }>>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [loadedMessages, setLoadedMessages] = useState<AiMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        getAuthToken().then(setJwtToken).catch(console.error);
    }, []);

    useEffect(() => {
        if (!activeChat?.id || !jwtToken) {
            setLoadedMessages([]);
            return;
        }

        setIsLoadingMessages(true);
        setFetchError(null);
        fetchChatMessages(activeChat.id)
            .then(setLoadedMessages)
            .catch(err => setFetchError(err.message))
            .finally(() => setIsLoadingMessages(false));
    }, [activeChat?.id, jwtToken]);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [inputError, setInputError] = useState('');
    const [isMessagesScrolling, setIsMessagesScrolling] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    const safeChats = chats ?? [];
    const serverMessages = useMemo(() => loadedMessages, [loadedMessages]);
    const messages = useMemo(() => [...serverMessages, ...optimisticMessages], [optimisticMessages, serverMessages]);
    const userFirstName = useMemo(() => authData.user?.name?.split(' ')[0] || 'Mahasiswa', [authData.user?.name]);
    const isEmptyState = messages.length === 0 && !isStreaming;

    const titleForm = useForm({
        title: '',
    });

    const pageErrors = pageProps.errors ?? {};
    const [showFlash, setShowFlash] = useState(true);

    useEffect(() => {
        if (pageProps.flash?.success) {
            setShowFlash(true);
            const timer = setTimeout(() => setShowFlash(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [pageProps.flash?.success]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, displayedStreamingContent, isStreaming]);

    useEffect(() => {
        if (!isStreaming && !streamingContent) {
            setDisplayedStreamingContent('');
            return;
        }

        if (displayedStreamingContent === streamingContent) {
            return;
        }

        const interval = window.setInterval(() => {
            setDisplayedStreamingContent((current) => {
                if (current.length >= streamingContent.length) {
                    window.clearInterval(interval);
                    return current;
                }

                const nextLength = Math.min(
                    streamingContent.length,
                    current.length + Math.max(1, Math.ceil((streamingContent.length - current.length) / 18)),
                );

                return streamingContent.slice(0, nextLength);
            });
        }, 28);

        return () => window.clearInterval(interval);
    }, [displayedStreamingContent, isStreaming, streamingContent]);

    // Focus input on load
    useEffect(() => {
        inputRef.current?.focus();
    }, [activeChat]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setIsMessagesScrolling(true);

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                setIsMessagesScrolling(false);
            }, 900);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const readStream = async (resp: Response, onChunk: (text: string) => void) => {
        if (!resp.body) return;
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            for (const line of text.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6);
                if (payload === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(payload);
                    if (parsed.content) {
                        accumulated += parsed.content;
                        onChunk(accumulated);
                    }
                } catch { /* skip malformed SSE chunks */ }
            }
        }
    };

    const waitForRevealToCatchUp = async (target: string) => {
        const timeoutAt = Date.now() + 12000;

        while (Date.now() < timeoutAt) {
            if (displayedStreamingContentRef.current === target) {
                return;
            }

            await new Promise((resolve) => window.setTimeout(resolve, 35));
        }
    };

    const apiHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
    }), [jwtToken]);

    const displayedStreamingContentRef = useRef('');

    useEffect(() => {
        displayedStreamingContentRef.current = displayedStreamingContent;
    }, [displayedStreamingContent]);

    const doStream = async (chatId: string, content: string) => {
        setOptimisticMessages([{ id: `opt-user-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }]);
        setIsStreaming(true);
        setStreamingContent('');
        setDisplayedStreamingContent('');

        try {
            const resp = await fetch(`${getCoreApiUrl()}/api/ai-chats/${chatId}/messages/stream`, {
                method: 'POST',
                headers: { ...apiHeaders, 'Accept': 'text/event-stream' },
                body: JSON.stringify({ content }),
            });

            if (!resp.ok || !resp.body) {
                setOptimisticMessages((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: 'assistant', content: 'Maaf, terjadi kesalahan. Silakan coba lagi.', created_at: new Date().toISOString() }]);
                setIsStreaming(false);
                return;
            }

            let finalText = '';
            await readStream(resp, (text) => {
                finalText = text;
                setStreamingContent(text);
            });

            await waitForRevealToCatchUp(finalText);
        } catch {
            setOptimisticMessages((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: 'assistant', content: 'Maaf, koneksi terputus. Silakan coba lagi.', created_at: new Date().toISOString() }]);
        } finally {
            setIsStreaming(false);
            setOptimisticMessages((prev) => {
                const userMessage = prev.find((message) => message.role === 'user');
                const finalAssistantContent = displayedStreamingContentRef.current || streamingContent;

                if (!userMessage || !finalAssistantContent) {
                    return prev;
                }

                return [
                    {
                        ...userMessage,
                        id: `sent-user-${Date.now()}`,
                    },
                    {
                        id: `sent-assistant-${Date.now()}`,
                        role: 'assistant',
                        content: finalAssistantContent,
                        created_at: new Date().toISOString(),
                    },
                ];
            });
        }
    };

    const doCreateAndStream = async (content: string) => {
        setOptimisticMessages([{ id: `opt-user-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }]);
        setIsStreaming(true);
        setStreamingContent('');
        setDisplayedStreamingContent('');

        try {
            const createResp = await fetch(`${getCoreApiUrl()}/api/ai-chats`, {
                method: 'POST',
                headers: apiHeaders,
                body: JSON.stringify({ title: content.substring(0, 50) }),
            });

            if (!createResp.ok) {
                setOptimisticMessages((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: 'assistant', content: 'Gagal membuat chat baru.', created_at: new Date().toISOString() }]);
                setIsStreaming(false);
                return;
            }

            const { data: newChat } = await createResp.json();
            const chatId = newChat.id;

            const streamResp = await fetch(`${getCoreApiUrl()}/api/ai-chats/${chatId}/messages/stream`, {
                method: 'POST',
                headers: { ...apiHeaders, 'Accept': 'text/event-stream' },
                body: JSON.stringify({ content }),
            });

            if (!streamResp.ok || !streamResp.body) {
                setOptimisticMessages((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: 'assistant', content: 'Maaf, terjadi kesalahan.', created_at: new Date().toISOString() }]);
                setIsStreaming(false);
                router.visit(student.aiChat.show.url({ chat: chatId }));
                return;
            }

            let finalText = '';
            await readStream(streamResp, (text) => {
                finalText = text;
                setStreamingContent(text);
            });

            await waitForRevealToCatchUp(finalText);

            const finalAssistantContent = displayedStreamingContentRef.current || finalText;

            router.visit(student.aiChat.show.url({ chat: chatId }), {
                preserveState: false,
                onSuccess: () => {
                    setIsStreaming(false);
                    setStreamingContent(finalAssistantContent);
                    setDisplayedStreamingContent(finalAssistantContent);
                },
            });
        } catch {
            setOptimisticMessages((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: 'assistant', content: 'Maaf, koneksi terputus.', created_at: new Date().toISOString() }]);
            setIsStreaming(false);
        }
    };

    const handleSendMessage = (e: FormEvent) => {
        e.preventDefault();
        if (isStreaming) return;

        const content = inputValue.trim();
        if (!content) {
            setInputError('Pesan tidak boleh kosong.');
            return;
        }
        setInputError('');
        setInputValue('');

        if (!activeChat) {
            doCreateAndStream(content);
        } else {
            doStream(activeChat.id, content);
        }
    };

    const handleNewChat = () => {
        router.visit(student.aiChat.index.url());
    };

    const handleDeleteChat = (id: string) => {
        router.delete(student.aiChat.destroy.url({ chat: id }), {
            onSuccess: () => {
                setShowDeleteModal(null);
            },
        });
    };

    const handleStartRename = (chat: AiChat) => {
        setEditingChatId(chat.id);
        setEditingTitle(chat.title || '');
        titleForm.setData('title', chat.title || '');
        titleForm.clearErrors();
    };

    const handleCancelRename = () => {
        setEditingChatId(null);
        setEditingTitle('');
        titleForm.reset();
        titleForm.clearErrors();
    };

    const handleSubmitRename = (chatId: string) => {
        if (titleForm.processing) return;

        if (!titleForm.data.title.trim()) {
            titleForm.setError('title', 'Judul chat tidak boleh kosong.');
            return;
        }

        titleForm.clearErrors('title');

        titleForm.patch(student.aiChat.update.url({ chat: chatId }), {
            preserveScroll: true,
            onSuccess: () => {
                handleCancelRename();
                router.reload({
                    only: ['chats', 'activeChat', 'flash', 'errors'],
                });
            },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return 'Baru saja';
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hari Ini';
        }

        if (date.toDateString() === yesterday.toDateString()) {
            return 'Kemarin';
        }

        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
        });
    };

    const prefillPrompt = (prompt: string) => {
        setInputValue(prompt);
        requestAnimationFrame(() => {
            inputRef.current?.focus({ preventScroll: true });
        });
    };

    return (
        <AppLayout title="Chat dengan AI" navItems={navItems}>
            <Head title="Chat dengan AI" />

            <div className="flex h-[calc(100vh-100px)] flex-col">
                <div className="flex items-center justify-end mb-3">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/75 bg-white/72 px-3.5 py-2.5 text-sm font-medium text-[#4A4A4A] shadow-[0_12px_28px_rgba(148,163,184,0.14)] transition-colors hover:text-[#88161c]"
                        title="Buka riwayat chat"
                    >
                        <Menu className="h-4.5 w-4.5" />
                        Riwayat
                    </button>
                </div>

                <div className="flex flex-1 flex-col min-h-0">
                    <div className={`flex min-h-0 flex-1 flex-col ${isEmptyState ? 'justify-center' : 'gap-4'}`}>
                        {isEmptyState ? (
                            <motion.div
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35 }}
                                className="mx-auto flex w-full max-w-2xl flex-col items-center"
                            >
                                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(136,22,28,0.14)] bg-[rgba(136,22,28,0.07)] shadow-[0_14px_32px_rgba(136,22,28,0.08)]">
                                    <Sparkles className="h-6 w-6 text-[#88161c]" />
                                </div>
                                <h2 className="text-center text-2xl font-bold leading-[1.15] tracking-[-0.02em] sm:text-3xl" style={headingStyle}>
                                    Apa yang sedang kamu kerjakan, {userFirstName}?
                                </h2>
                                <p className="mt-3 max-w-lg text-center text-sm leading-6 text-[#5B6473]">
                                    Mulai percakapan, minta ringkasan materi, susun rencana belajar, atau eksplor ide tugas dengan AI Kolabri.
                                </p>
                            </motion.div>
                        ) : (
                            <LiquidGlassCard intensity="light" className="flex-1 overflow-hidden p-5 lg:p-6" lightMode={true}>
                                <div
                                    ref={messagesContainerRef}
                                    className={`chat-scrollbar h-full space-y-4 overflow-y-auto pr-2 ${isMessagesScrolling ? 'is-scrolling' : ''}`}
                                >
                                    {isLoadingMessages ? (
                                        <ChatSkeleton messageCount={4} />
                                    ) : messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                        >
                                            <div
                                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                                                style={{
                                                    background: message.role === 'user'
                                                        ? 'linear-gradient(135deg, #88161c 0%, #a41219 100%)'
                                                        : 'rgba(136,22,28,0.08)',
                                                    border: message.role === 'user'
                                                        ? '1px solid rgba(255,255,255,0.18)'
                                                        : '1px solid rgba(136,22,28,0.12)',
                                                }}
                                            >
                                                {message.role === 'user' ? (
                                                    <span className="text-sm font-bold text-white">
                                                        {authData.user?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </span>
                                                ) : (
                                                        <Sparkles className="h-3.5 w-3.5" style={{ color: '#88161c' }} />
                                                )}
                                            </div>
                                            <div
                                                className="max-w-[84%] rounded-[24px] px-4 py-3.5"
                                                style={{
                                                    background: message.role === 'user'
                                                        ? 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)'
                                                        : 'rgba(255,255,255,0.82)',
                                                    border: message.role === 'user'
                                                        ? '1px solid rgba(255,255,255,0.18)'
                                                        : '1px solid rgba(255,255,255,0.82)',
                                                    boxShadow: '0 12px 26px rgba(148,163,184,0.10)',
                                                }}
                                            >
                                                {message.role === 'assistant' ? (
                                                    <div className="prose prose-sm max-w-none text-[#374151] leading-7 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:text-[#1f2937] [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[#88161c] [&_pre]:rounded-xl [&_pre]:bg-gray-50 [&_pre]:p-3">
                                                        <ReactMarkdown>{sanitizeHtml(formatAiOutput(message.content))}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm whitespace-pre-wrap leading-7 text-white">
                                                        {message.content}
                                                    </p>
                                                )}
                                                <p className={`mt-1 text-xs ${message.role === 'user' ? 'text-white/70' : 'text-[#6B7280]'}`}>
                                                    {formatTime(message.created_at)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {!isLoadingMessages && isStreaming && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                <Sparkles className="h-3.5 w-3.5" style={{ color: '#88161c' }} />
                                            </div>
                                            <div className="max-w-[84%] rounded-[24px] px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.82)', boxShadow: '0 12px 26px rgba(148,163,184,0.10)' }}>
                                                {displayedStreamingContent ? (
                                                    <div className="prose prose-sm max-w-none text-[#374151] leading-7 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:text-[#1f2937] [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[#88161c] [&_pre]:rounded-xl [&_pre]:bg-gray-50 [&_pre]:p-3">
                                                        <ReactMarkdown>{sanitizeHtml(formatAiOutput(displayedStreamingContent))}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1 py-1">
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '0ms' }} />
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '150ms' }} />
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                )}
                                                {displayedStreamingContent ? null : (
                                                    <p className="mt-1 text-xs text-[#6B7280]">AI sedang memproses…</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </LiquidGlassCard>
                        )}

                        {fetchError && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                                        <X className="h-4 w-4 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-red-800">{fetchError}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (activeChat?.id && jwtToken) {
                                                    setFetchError(null);
                                                    setIsLoadingMessages(true);
                                                    fetchChatMessages(activeChat.id)
                                                        .then(setLoadedMessages)
                                                        .catch(err => setFetchError(err.message))
                                                        .finally(() => setIsLoadingMessages(false));
                                                }
                                            }}
                                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                            Coba Lagi
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={`${isEmptyState ? 'mx-auto mt-8 w-full max-w-2xl pb-4' : 'mt-auto pb-2'}`}>
                        <LiquidGlassCard intensity="medium" className="p-4 lg:p-5" lightMode={true}>
                            <form onSubmit={handleSendMessage}>
                                {(inputError || titleForm.errors.title || pageErrors.content || pageErrors.title || pageErrors.chat || (pageProps.flash?.success && showFlash)) && (
                                    <div className="mb-3 space-y-2 px-1">
                                        {pageProps.flash?.success && showFlash && (
                                            <div className="rounded-2xl border px-3 py-2 text-sm font-medium text-[#88161c] transition-opacity" style={{ background: 'rgba(136,22,28,0.06)', borderColor: 'rgba(136,22,28,0.14)' }}>
                                                {pageProps.flash.success}
                                            </div>
                                        )}
                                        {(inputError || titleForm.errors.title || pageErrors.content || pageErrors.title || pageErrors.chat) && (
                                            <div className="rounded-2xl border px-3 py-2 text-sm font-medium text-red-700" style={{ background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.18)' }}>
                                                {inputError || titleForm.errors.title || pageErrors.content || pageErrors.title || pageErrors.chat}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isEmptyState && (
                                    <div className="mb-4 flex flex-wrap gap-2 px-1">
                                        {emptyStateCards.map((item, index) => (
                                            <button
                                                key={`${item.eyebrow}-${index}`}
                                                type="button"
                                                onClick={() => prefillPrompt(item.prompt)}
                                                className="rounded-full px-3 py-1.5 text-xs font-medium shadow-[0_8px_22px_rgba(148,163,184,0.08)] transition-colors hover:bg-[rgba(136,22,28,0.10)] sm:text-sm"
                                                style={{
                                                    color: '#88161c',
                                                    background: 'rgba(136,22,28,0.08)',
                                                    border: '1px solid rgba(136,22,28,0.14)',
                                                }}
                                            >
                                                {item.eyebrow}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="rounded-[24px] border bg-white/92 px-3 py-2.5 shadow-[0_14px_32px_rgba(148,163,184,0.10)]" style={{ borderColor: 'rgba(226,232,240,0.9)' }}>
                                    <div className="flex items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={handleNewChat}
                                            className="flex h-9 w-9 items-center justify-center self-center rounded-xl text-[#6B7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#88161c]"
                                            title="Chat baru"
                                        >
                                            <Plus className="h-4.5 w-4.5" />
                                        </button>
                                        <textarea
                                            ref={inputRef}
                                            value={inputValue}
                                            onChange={(e) => { setInputValue(e.target.value); setInputError(''); }}
                                            onKeyDown={handleKeyDown}
                                            placeholder={isEmptyState ? 'Tanyakan apa saja tentang tugas, ide, atau rencana belajarmu' : 'Ketik pesan...'}
                                            rows={1}
                                            className="min-h-[40px] flex-1 resize-none overflow-hidden bg-transparent px-1 py-2.5 text-sm leading-6 text-[#374151] placeholder-[#7B8494] focus:outline-none"
                                            style={{ height: '40px' }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = target.scrollHeight + 'px';
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputValue.length || isStreaming}
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-center rounded-full text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                boxShadow: '0 10px 20px rgba(136,22,28,0.16)',
                                            }}
                                        >
                                            {isStreaming ? (
                                                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                            ) : (
                                                    <Send className="h-4.5 w-4.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-center text-[11px] text-[#748091] sm:text-xs">
                                    Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
                                </p>
                            </form>
                        </LiquidGlassCard>
                        </div>
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: 320, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 320, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="fixed inset-y-0 right-0 z-50 w-full max-w-[340px] p-3"
                        >
                            <LiquidGlassCard intensity="light" className="flex h-full flex-col p-3.5 lg:p-4" lightMode={true}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Percakapan</p>
                                        <h3 className="mt-1 text-base font-semibold" style={headingStyle}>
                                            Riwayat AI
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSidebarOpen(false)}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-[#6B7280] transition-colors hover:text-[#88161c]"
                                        title="Tutup sidebar"
                                    >
                                        <X className="h-4.5 w-4.5" />
                                    </button>
                                </div>

                                <PrimaryButton onClick={handleNewChat} className="mt-4 w-full justify-center px-4 py-3 text-sm">
                                    <Plus className="h-4 w-4" />
                                    Chat Baru
                                </PrimaryButton>

                                <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
                                    {safeChats.length === 0 ? (
                                        <div className="rounded-2xl border px-4 py-6 text-center" style={{ borderColor: 'rgba(136,22,28,0.10)', background: 'rgba(255,255,255,0.55)' }}>
                                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                <MessageSquare className="h-5 w-5" style={{ color: '#88161c' }} />
                                            </div>
                                            <p className="text-sm font-medium text-[#4A4A4A]">Belum ada percakapan</p>
                                            <p className="mt-1 text-xs text-[#6B7280]">Mulai chat baru untuk bertanya kepada AI.</p>
                                        </div>
                                    ) : (
                                        safeChats.map((chat) => (
                                            <div
                                                key={chat.id}
                                                className={`group relative rounded-2xl border p-2.5 transition-colors ${activeChat?.id === chat.id ? 'bg-white/80' : 'bg-white/45 hover:bg-white/72'}`}
                                                style={{ borderColor: activeChat?.id === chat.id ? 'rgba(136,22,28,0.15)' : 'rgba(255,255,255,0.55)' }}
                                            >
                                                <Link href={student.aiChat.show.url({ chat: chat.id })} className="flex items-start gap-3 pr-16" onClick={() => setSidebarOpen(false)}>
                                                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                        <MessageSquare className="h-4 w-4" style={{ color: '#88161c' }} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        {editingChatId === chat.id ? (
                                                            <div className="space-y-2">
                                                                <input
                                                                    value={editingTitle}
                                                                    onChange={(e) => {
                                                                        setEditingTitle(e.target.value);
                                                                        titleForm.setData('title', e.target.value);
                                                                        if (titleForm.errors.title) {
                                                                            titleForm.clearErrors('title');
                                                                        }
                                                                    }}
                                                                    onClick={(e) => e.preventDefault()}
                                                                    onKeyDown={(e) => {
                                                                        e.stopPropagation();
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            handleSubmitRename(chat.id);
                                                                        }
                                                                        if (e.key === 'Escape') {
                                                                            e.preventDefault();
                                                                            handleCancelRename();
                                                                        }
                                                                    }}
                                                                    className="w-full rounded-xl border border-[rgba(136,22,28,0.16)] bg-white/90 px-3 py-2 text-sm font-medium text-[#4A4A4A] outline-none"
                                                                />
                                                                {titleForm.errors.title && (
                                                                    <p className="text-xs font-medium text-red-600">{titleForm.errors.title}</p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className={`truncate text-sm font-medium ${activeChat?.id === chat.id ? 'text-[#88161c]' : 'text-[#4A4A4A]'}`}>
                                                                {chat.title || 'Chat Baru'}
                                                            </p>
                                                        )}
                                                        <p className="mt-1 text-xs text-[#6B7280]">{formatDate(chat.updated_at)}</p>
                                                    </div>
                                                </Link>
                                                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                                                    {editingChatId === chat.id ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSubmitRename(chat.id)}
                                                                className="rounded-lg p-1 text-emerald-600 transition-colors hover:bg-white/80"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelRename}
                                                                className="rounded-lg p-1 text-[#6B7280] transition-colors hover:bg-white/80 hover:text-[#88161c]"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartRename(chat)}
                                                                className="rounded-lg p-1 text-[#6B7280] transition-colors hover:bg-white/80 hover:text-[#88161c]"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setShowDeleteModal(chat.id)}
                                                                className="rounded-lg p-1 text-[#6B7280] transition-colors hover:bg-white/80 hover:text-[#88161c]"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </LiquidGlassCard>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeleteModal(null)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-sm text-center" lightMode={true}>
                                <div onClick={(e) => e.stopPropagation()} className="p-5">
                                    <div 
                                        className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
                                        style={{
                                            background: 'rgba(220,38,38,0.08)',
                                            border: '1px solid rgba(220,38,38,0.15)',
                                        }}
                                    >
                                        <Trash2 className="h-5 w-5 text-red-600" />
                                    </div>
                                    <h3 className="text-base font-semibold" style={headingStyle}>
                                        Hapus Percakapan?
                                    </h3>
                                    <p className={`mt-2 ${bodyTextClass}`}>
                                        Percakapan ini akan dihapus secara permanen dan tidak dapat dikembalikan.
                                    </p>
                                    <div className="mt-5 flex gap-2.5">
                                        <SecondaryButton onClick={() => setShowDeleteModal(null)} className="flex-1">
                                            Batal
                                        </SecondaryButton>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteChat(showDeleteModal)}
                                            className="flex-1 rounded-full px-6 py-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(185,28,28,0.28)] transition-transform hover:-translate-y-0.5"
                                            style={{
                                                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                                border: '1px solid rgba(255,255,255,0.16)',
                                            }}
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
