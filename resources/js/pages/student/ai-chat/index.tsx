import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Menu, MessageSquare, Pencil, Plus, Send, Sparkles, Trash2, X } from 'lucide-react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { AiMessage, SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
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
        eyebrow: 'Fast Start',
        title: 'Bantu pecahkan ide, umpan balik, dan tugas jadi lebih terarah.',
        prompt: 'Bantu saya menyusun ide utama untuk tugas saya dan beri langkah pengerjaannya.',
    },
    {
        icon: Sparkles,
        eyebrow: 'Collaborate with AI',
        title: 'Diskusikan materi, minta ringkasan, lalu rapikan pemahaman Anda lebih cepat.',
        prompt: 'Ringkas materi yang sedang saya pelajari lalu jelaskan poin paling pentingnya.',
    },
    {
        icon: CalendarDays,
        eyebrow: 'Planning',
        title: 'Atur prioritas belajar, pecah target mingguan, dan tetap fokus pada progres.',
        prompt: 'Bantu saya membuat rencana belajar mingguan yang realistis untuk mata kuliah saya.',
    },
] as const;

const quickActions = [
    'Deep Research',
    'Ringkas Materi',
    'Buat Rencana',
    'Cari Ide Tugas',
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
    const navItems = useStudentNav('ai-chat');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isTyping] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const safeChats = chats ?? [];
    const messages = useMemo(() => activeChat?.messages ?? [], [activeChat?.messages]);
    const userFirstName = useMemo(() => authData.user?.name?.split(' ')[0] || 'Mahasiswa', [authData.user?.name]);
    const isEmptyState = messages.length === 0;

    const messageForm = useForm({
        content: '',
    });

    const titleForm = useForm({
        title: '',
    });

    const pageErrors = pageProps.errors ?? {};

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on load
    useEffect(() => {
        inputRef.current?.focus();
    }, [activeChat]);

    const handleSendMessage = (e: FormEvent) => {
        e.preventDefault();
        if (messageForm.processing) return;

        if (!messageForm.data.content.trim()) {
            messageForm.setError('content', 'Pesan tidak boleh kosong.');
            return;
        }

        messageForm.clearErrors('content');

        if (!activeChat) {
            // Create new conversation with first message
            router.post(student.aiChat.store.url(), {
                title: messageForm.data.content.substring(0, 50),
                first_message: messageForm.data.content,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    messageForm.reset();
                },
            });
        } else {
            // Add message to existing conversation
            messageForm.post(student.aiChat.messages.store.url({ chat: activeChat.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    messageForm.reset();
                },
            });
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
        messageForm.setData('content', prompt);
        requestAnimationFrame(() => {
            inputRef.current?.focus({ preventScroll: true });
        });
    };

    return (
        <AppLayout title="Chat dengan AI" navItems={navItems}>
            <Head title="Chat dengan AI" />

            <div className="flex h-[calc(100vh-100px)] flex-col">
                <div className="flex items-center justify-end mb-4">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/75 bg-white/72 text-[#4A4A4A] shadow-[0_12px_28px_rgba(148,163,184,0.14)] transition-colors hover:text-[#88161c]"
                        title="Buka riwayat chat"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid gap-4 grid-cols-1 flex-1">
                    <div className={`flex min-h-0 flex-col gap-4 ${isEmptyState ? 'justify-center' : ''}`}>
                        {isEmptyState ? (
                            <motion.div
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35 }}
                                className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center"
                            >
                                <div className="mx-auto w-full max-w-3xl text-center">
                                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(136,22,28,0.14)] bg-[rgba(136,22,28,0.07)] shadow-[0_14px_32px_rgba(136,22,28,0.08)]">
                                        <Sparkles className="h-6 w-6 text-[#88161c]" />
                                    </div>
                                    <h2 className="text-3xl font-bold leading-[1.15] tracking-[-0.02em] md:text-4xl" style={headingStyle}>
                                        What are you working on, {userFirstName}?
                                    </h2>
                                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#5B6473] sm:text-base">
                                        Mulai percakapan, minta ringkasan materi, susun rencana belajar, atau eksplor ide tugas dengan AI Kolabri.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <LiquidGlassCard intensity="light" className="flex-1 overflow-hidden p-5 lg:p-6" lightMode={true}>
                                <div className="h-full space-y-4 overflow-y-auto">
                                    {messages.map((message) => (
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
                                                <p className={`text-sm whitespace-pre-wrap leading-7 ${message.role === 'user' ? 'text-white' : 'text-[#374151]'}`}>
                                                    {message.content}
                                                </p>
                                                <p className={`mt-1 text-xs ${message.role === 'user' ? 'text-white/70' : 'text-[#6B7280]'}`}>
                                                    {formatTime(message.created_at)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {isTyping && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                <Sparkles className="h-3.5 w-3.5" style={{ color: '#88161c' }} />
                                            </div>
                                            <div className="rounded-[24px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                                                <div className="flex gap-1">
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '0ms' }} />
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '150ms' }} />
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </LiquidGlassCard>
                        )}

                        <div className={`${isEmptyState ? 'mx-auto w-full max-w-4xl pb-4' : 'mt-auto pb-2'}`}>
                        <LiquidGlassCard intensity="medium" className={`${isEmptyState ? 'p-4 lg:p-5' : 'p-4 lg:p-5'}`} lightMode={true}>
                            <form onSubmit={handleSendMessage}>
                                {(messageForm.errors.content || titleForm.errors.title || pageErrors.content || pageErrors.title || pageErrors.chat || pageProps.flash?.success) && (
                                    <div className="mb-3 space-y-2 px-1">
                                        {pageProps.flash?.success && (
                                            <div className="rounded-2xl border px-3 py-2 text-sm font-medium text-emerald-700" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.18)' }}>
                                                {pageProps.flash.success}
                                            </div>
                                        )}
                                        {(messageForm.errors.content || titleForm.errors.title || pageErrors.content || pageErrors.title || pageErrors.chat) && (
                                            <div className="rounded-2xl border px-3 py-2 text-sm font-medium text-red-700" style={{ background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.18)' }}>
                                                {messageForm.errors.content || titleForm.errors.title || pageErrors.content || pageErrors.title || pageErrors.chat}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={`flex flex-wrap gap-2 px-1 ${isEmptyState ? 'mb-4 justify-start' : 'mb-2.5'}`}>
                                    {(isEmptyState ? emptyStateCards : quickActions).map((item, index) => {
                                        const action = typeof item === 'string' ? item : item.eyebrow;
                                        const prompt = typeof item === 'string'
                                            ? action === 'Deep Research'
                                                ? 'Lakukan riset mendalam tentang topik ini dan jelaskan temuan utamanya.'
                                                : action === 'Ringkas Materi'
                                                    ? 'Ringkas materi ini menjadi poin-poin yang mudah dipahami.'
                                                    : action === 'Buat Rencana'
                                                        ? 'Bantu saya membuat rencana langkah demi langkah untuk menyelesaikan tugas ini.'
                                                        : 'Berikan beberapa ide tugas atau topik diskusi yang relevan untuk materi ini.'
                                            : item.prompt;

                                        return (
                                        <button
                                            key={`${action}-${index}`}
                                            type="button"
                                            onClick={() => prefillPrompt(prompt)}
                                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[rgba(136,22,28,0.10)] sm:text-sm ${isEmptyState ? 'shadow-[0_8px_22px_rgba(148,163,184,0.08)]' : ''}`}
                                            style={{
                                                color: '#88161c',
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.14)',
                                            }}
                                        >
                                            {action}
                                        </button>
                                        );
                                    })}
                                </div>
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
                                            value={messageForm.data.content}
                                            onChange={(e) => messageForm.setData('content', e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={isEmptyState ? 'Ask anything about your coursework, ideas, or study plan' : 'Contoh: "Jelaskan konsep ini dengan sederhana"'}
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
                                            disabled={!messageForm.data.content.length || messageForm.processing}
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-center rounded-full text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                boxShadow: '0 10px 20px rgba(136,22,28,0.16)',
                                            }}
                                        >
                                            {messageForm.processing ? (
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
