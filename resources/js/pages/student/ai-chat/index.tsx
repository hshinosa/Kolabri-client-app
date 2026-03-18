import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, CalendarDays, Clock3, Menu, MessageSquare, Plus, Search, Send, Sparkles, Trash2 } from 'lucide-react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { AiMessage, SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import student from '@/routes/student';
import auth from '@/routes/auth';

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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const safeChats = chats ?? [];
    const messages = activeChat?.messages ?? [];
    const userFirstName = useMemo(() => authData.user?.name?.split(' ')[0] || 'Mahasiswa', [authData.user?.name]);

    const messageForm = useForm({
        content: '',
    });

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
        if (!messageForm.data.content.trim() || messageForm.processing) return;

        if (!activeChat) {
            // Create new conversation with first message
            router.post(
                student.aiChat.store.url(),
                { 
                    title: messageForm.data.content.substring(0, 50),
                    first_message: messageForm.data.content 
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        messageForm.reset();
                    },
                }
            );
        } else {
            // Add message to existing conversation
            router.post(
                student.aiChat.messages.store.url({ chat: activeChat.id }),
                { content: messageForm.data.content },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        messageForm.reset();
                    },
                }
            );
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

    const shellBorder = '1px solid rgba(136,22,28,0.10)';
    const shellBackground = 'rgba(244,240,246,0.88)';
    const panelBackground = 'rgba(255,255,255,0.92)';

    const prefillPrompt = (prompt: string) => {
        messageForm.setData('content', prompt);
        requestAnimationFrame(() => {
            inputRef.current?.focus({ preventScroll: true });
        });
    };

    return (
        <div 
            className="relative flex h-screen overflow-hidden"
            style={{
                background: 'radial-gradient(circle at top left, rgba(255,255,255,0.98) 0%, rgba(245,241,248,0.9) 38%, rgba(226,233,252,0.86) 70%, rgba(243,237,231,0.74) 100%)',
            }}
        >
            <Head title="Chat dengan AI" />

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-[88px] bg-[linear-gradient(180deg,rgba(242,238,247,0.94)_0%,rgba(236,232,245,0.72)_100%)]" />
                <div className="absolute left-[14%] top-[10%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0)_72%)]" />
                <div className="absolute right-[10%] top-[6%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(251,231,197,0.36)_0%,rgba(251,231,197,0)_72%)]" />
                <div className="absolute bottom-[8%] right-[4%] h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,rgba(186,201,251,0.3)_0%,rgba(186,201,251,0)_74%)]" />
            </div>

            <aside className="relative z-10 flex w-[86px] flex-col items-center justify-between border-r px-3 py-5" style={{ borderColor: 'rgba(255,255,255,0.55)', background: 'rgba(242,239,247,0.72)', backdropFilter: 'blur(18px)' }}>
                <div className="flex flex-col items-center gap-3">
                    <button
                        type="button"
                        onClick={handleNewChat}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[0_12px_28px_rgba(17,17,39,0.16)] transition-transform hover:scale-[1.03]"
                        style={{ background: 'linear-gradient(135deg, #232339 0%, #16162b 100%)' }}
                        title="Chat baru"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((value) => !value)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border bg-white/80 text-[#6B7280] transition-colors hover:text-[#88161c]"
                        style={{ borderColor: 'rgba(209,213,219,0.9)' }}
                        title="Riwayat percakapan"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border bg-white/72 text-[#6B7280]" style={{ borderColor: 'rgba(209,213,219,0.85)' }}>
                        <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border bg-white/72 text-[#6B7280]" style={{ borderColor: 'rgba(209,213,219,0.85)' }}>
                        <Clock3 className="h-5 w-5" />
                    </div>
                </div>

                <Link
                    href={student.courses.index.url()}
                    className="flex h-11 w-11 items-center justify-center rounded-full border bg-white/80 text-[#111827] transition-colors hover:text-[#88161c]"
                    style={{ borderColor: 'rgba(209,213,219,0.9)' }}
                    title="Kembali"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </aside>

            {/* Sidebar - Conversation History */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 282, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'tween', duration: 0.2 }}
                        className="flex h-full flex-col border-r shadow-[18px_0_40px_rgba(148,163,184,0.14)]"
                        style={{
                            background: shellBackground,
                            borderColor: 'rgba(136,22,28,0.10)',
                            backdropFilter: 'blur(22px) saturate(150%)',
                            WebkitBackdropFilter: 'blur(22px) saturate(150%)',
                        }}
                    >
                        <div className="flex h-full flex-col">
                            <div className="flex h-16 items-center justify-between border-b px-5" style={{ borderColor: 'rgba(136,22,28,0.10)' }}>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#6B7280]">History</p>
                                    <p className="mt-1 text-sm font-semibold text-[#4A4A4A]">Percakapan AI</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleNewChat}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        boxShadow: '0 10px 24px rgba(136,22,28,0.24)',
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Baru
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-3 py-4">
                                {safeChats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div 
                                            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                                            style={{
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.12)',
                                            }}
                                        >
                                            <MessageSquare className="h-6 w-6" style={{ color: '#88161c' }} />
                                        </div>
                                        <p className="text-sm font-medium text-[#4A4A4A]">Belum ada percakapan</p>
                                        <p className="mt-1 text-xs leading-5 text-[#6B7280]">Mulai chat baru untuk bertanya kepada AI</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {safeChats.map((chat) => (
                                            <div
                                                key={chat.id}
                                                className={`group relative flex items-center rounded-xl p-3 transition-colors ${
                                                    activeChat?.id === chat.id
                                                        ? 'bg-white/85'
                                                        : 'hover:bg-white/70'
                                                }`}
                                                style={activeChat?.id === chat.id ? {
                                                    border: '1px solid rgba(136,22,28,0.15)',
                                                } : { border: '1px solid transparent' }}
                                            >
                                                <Link
                                                    href={student.aiChat.show.url({ chat: chat.id })}
                                                    className="flex flex-1 items-center gap-3"
                                                >
                                                    <div className="flex-shrink-0">
                                                        <MessageSquare className="h-5 w-5" style={{ color: activeChat?.id === chat.id ? '#88161c' : '#6B7280' }} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p 
                                                            className="truncate text-sm font-medium"
                                                            style={{ color: activeChat?.id === chat.id ? '#88161c' : '#4A4A4A' }}
                                                        >
                                                            {chat.title || 'Chat Baru'}
                                                        </p>
                                                        <p className="text-xs text-[#6B7280]">
                                                            {formatDate(chat.updated_at)}
                                                        </p>
                                                    </div>
                                                </Link>
                                                <button
                                                    onClick={() => setShowDeleteModal(chat.id)}
                                                    className="absolute right-2 hidden rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-white/80 hover:text-[#88161c] group-hover:block"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
                                <div 
                                    className="flex items-center gap-3 rounded-xl p-3"
                                    style={{
                                        background: 'rgba(255,255,255,0.92)',
                                        border: '1px solid rgba(255,255,255,0.72)',
                                    }}
                                >
                                    <div 
                                        className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                            border: '1px solid rgba(255,255,255,0.18)',
                                        }}
                                    >
                                        {authData.user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold" style={{ color: '#4A4A4A' }}>
                                            {authData.user?.name || 'User'}
                                        </p>
                                        <p className="truncate text-xs text-[#4B5563]">Mahasiswa</p>
                                    </div>
                                    <Link
                                        href={auth.logout.url()}
                                        method="post"
                                        as="button"
                                        className="rounded-lg p-2 text-[#4B5563] transition-colors hover:bg-white/60 hover:text-[#88161c]"
                                        title="Keluar"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="relative z-10 flex flex-1 flex-col">
                {/* Chat Header */}
                <div className="px-6 pt-5 lg:px-10">
                    <header className="flex h-12 items-center justify-between">
                        <div className="flex items-center gap-3 text-sm text-[#4B5563]">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen((value) => !value)}
                                className="rounded-xl p-2 transition-colors hover:bg-white/60 hover:text-[#88161c]"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <span className="font-medium">Assistant v2.6</span>
                        </div>
                        <p className="text-sm font-medium text-[#111827]">CoRegula AI</p>
                        <button
                            type="button"
                            className="rounded-full px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(17,17,39,0.16)]"
                            style={{ background: 'linear-gradient(135deg, #232339 0%, #16162b 100%)' }}
                        >
                            Upgrade
                        </button>
                    </header>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 lg:px-10">
                    {messages.length === 0 ? (
                        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-between pb-8 pt-8 text-center lg:pt-10">
                            <div className="w-full">
                                <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
                                    <div className="mx-auto max-w-[640px] lg:mx-0 lg:justify-self-center">
                                        <h2 className="text-[2.7rem] font-bold leading-[1.04] tracking-[-0.04em] md:text-[4rem]" style={headingStyle}>
                                            Hi {userFirstName}, Ready to <br className="hidden md:block" /> Achieve Great Things?
                                        </h2>
                                        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#5B6475] lg:mx-0">
                                            Gunakan AI assistant untuk menjelaskan materi, memecah tugas, dan membantu Anda tetap fokus pada target belajar.
                                        </p>
                                    </div>

                                    <div className="relative mx-auto mt-2 flex w-full max-w-[260px] justify-center lg:mt-0">
                                        <div className="absolute right-0 top-3 rounded-2xl bg-white px-4 py-3 text-left text-sm font-medium text-[#4A4A4A] shadow-[0_16px_34px_rgba(148,163,184,0.18)]">
                                            Hey there! 👋<br />
                                            Need a boost?
                                        </div>
                                        <div className="mt-12 flex h-[220px] w-[180px] items-center justify-center rounded-[42px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(229,236,250,0.9)_100%)] shadow-[0_20px_54px_rgba(148,163,184,0.18)]">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(180deg,#1e2238_0%,#2f4164_100%)] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.15)]">
                                                    <Bot className="h-10 w-10 text-white" />
                                                </div>
                                                <div className="h-14 w-24 rounded-[22px] border border-white/75 bg-white/75" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
                                    {emptyStateCards.map((card, index) => (
                                        <motion.button
                                            key={card.title}
                                            type="button"
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.08, duration: 0.35 }}
                                            onClick={() => prefillPrompt(card.prompt)}
                                            className="rounded-[30px] p-6 text-left transition-transform hover:-translate-y-1"
                                            style={{
                                                background: 'rgba(255,255,255,0.88)',
                                                border: '1px solid rgba(255,255,255,0.82)',
                                                boxShadow: '0 20px 48px rgba(148,163,184,0.16)',
                                            }}
                                        >
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                <card.icon className="h-6 w-6" style={{ color: '#88161c' }} />
                                            </div>
                                            <p className="mt-6 text-[1.05rem] font-semibold leading-8 text-[#1F2937]">{card.title}</p>
                                            <p className="mt-6 text-sm font-medium text-[#7C8598]">{card.eyebrow}</p>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-4xl space-y-4 pb-10 pt-6">
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div
                                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            background: message.role === 'user'
                                                ? '#88161c'
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
                                            <Sparkles className="h-4 w-4" style={{ color: '#88161c' }} />
                                        )}
                                    </div>
                                    <div
                                        className="max-w-[82%] rounded-[26px] px-5 py-4"
                                        style={{
                                            background: message.role === 'user'
                                                ? 'linear-gradient(135deg, #1f1f35 0%, #24213c 100%)'
                                                : 'rgba(255,255,255,0.78)',
                                            border: message.role === 'user'
                                                ? '1px solid rgba(255,255,255,0.18)'
                                                : '1px solid rgba(255,255,255,0.72)',
                                            boxShadow: message.role === 'user'
                                                ? '0 18px 34px rgba(31,31,53,0.18)'
                                                : '0 16px 30px rgba(148,163,184,0.12)',
                                        }}
                                    >
                                        <p className={`text-sm whitespace-pre-wrap ${message.role === 'user' ? 'text-white' : 'text-[#4A4A4A]'}`}>
                                            {message.content}
                                        </p>
                                        <p
                                            className={`mt-1 text-xs ${
                                                message.role === 'user' ? 'text-white/70' : 'text-[#6B7280]'
                                            }`}
                                        >
                                            {formatTime(message.created_at)}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                                    <div 
                                        className="flex h-8 w-8 items-center justify-center rounded-full"
                                        style={{
                                            background: 'rgba(136,22,28,0.08)',
                                            border: '1px solid rgba(136,22,28,0.12)',
                                        }}
                                    >
                                        <Sparkles className="h-4 w-4" style={{ color: '#88161c' }} />
                                    </div>
                                    <div 
                                        className="rounded-2xl px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.08)]"
                                        style={{
                                            background: 'rgba(255,255,255,0.94)',
                                            border: '1px solid rgba(226,232,240,0.82)',
                                        }}
                                    >
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
                    )}
                </div>

                {/* Message Input */}
                <div className="px-6 pb-6 pt-2 lg:px-10 lg:pb-8">
                    <form onSubmit={handleSendMessage} className="mx-auto max-w-4xl">
                        <div 
                            className="relative rounded-[32px] p-3"
                            style={{
                                background: 'rgba(255,255,255,0.92)',
                                border: '1px solid rgba(255,255,255,0.82)',
                                boxShadow: '0 28px 62px rgba(148,163,184,0.18)',
                                backdropFilter: 'blur(18px)',
                            }}
                        >
                            <div className="flex items-start justify-between gap-4 px-2 pb-2 pt-1 text-sm text-[#6B7280]">
                                <span className="inline-flex items-center gap-2 rounded-full px-2 py-1">
                                    <Sparkles className="h-4 w-4" />
                                    Unlock more with AI Assistant
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full px-2 py-1">
                                    <Bot className="h-4 w-4" />
                                    Powered by Assistant v2.6
                                </span>
                            </div>
                            <div className="flex items-end gap-3 rounded-[28px] border bg-white px-3 py-3" style={{ borderColor: 'rgba(226,232,240,0.85)' }}>
                                <button
                                    type="button"
                                    onClick={handleNewChat}
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#6B7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
                                    title="Chat baru"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                                <textarea
                                    ref={inputRef}
                                    value={messageForm.data.content}
                                    onChange={(e) => messageForm.setData('content', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder='Example: “Jelaskan konsep ini dengan sederhana”'
                                    rows={1}
                                    className="max-h-32 min-h-[48px] flex-1 resize-none bg-transparent px-1 py-3 text-sm text-[#4A4A4A] placeholder-[#6B7280] focus:outline-none"
                                    style={{ height: 'auto' }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!messageForm.data.content.trim() || messageForm.processing}
                                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{
                                        background: 'linear-gradient(135deg, #232339 0%, #16162b 100%)',
                                        boxShadow: '0 12px 28px rgba(17,17,39,0.18)',
                                    }}
                                >
                                    {messageForm.processing ? (
                                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <Send className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 px-1 pb-1">
                                {quickActions.map((action) => (
                                    <button
                                        key={action}
                                        type="button"
                                        onClick={() => prefillPrompt(action === 'Deep Research'
                                            ? 'Lakukan riset mendalam tentang topik ini dan jelaskan temuan utamanya.'
                                            : action === 'Ringkas Materi'
                                                ? 'Ringkas materi ini menjadi poin-poin yang mudah dipahami.'
                                                : action === 'Buat Rencana'
                                                    ? 'Bantu saya membuat rencana langkah demi langkah untuk menyelesaikan tugas ini.'
                                                    : 'Berikan beberapa ide tugas atau topik diskusi yang relevan untuk materi ini.')}
                                        className="rounded-full px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                                        style={{ background: 'linear-gradient(135deg, #232339 0%, #16162b 100%)' }}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="mt-2 text-center text-xs text-[#4B5563]">
                            Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
                        </p>
                    </form>
                </div>
            </div>

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
                                <div onClick={(e) => e.stopPropagation()} className="p-6">
                                    <div 
                                        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                                        style={{
                                            background: 'rgba(220,38,38,0.08)',
                                            border: '1px solid rgba(220,38,38,0.15)',
                                        }}
                                    >
                                        <Trash2 className="h-6 w-6 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold" style={headingStyle}>
                                        Hapus Percakapan?
                                    </h3>
                                    <p className={`mt-2 ${bodyTextClass}`}>
                                        Percakapan ini akan dihapus secara permanen dan tidak dapat dikembalikan.
                                    </p>
                                    <div className="mt-6 flex gap-3">
                                        <SecondaryButton onClick={() => setShowDeleteModal(null)} className="flex-1">
                                            Batal
                                        </SecondaryButton>
                                        <PrimaryButton
                                            onClick={() => handleDeleteChat(showDeleteModal)}
                                            className="flex-1"
                                            style={{
                                                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                            }}
                                        >
                                            Hapus
                                        </PrimaryButton>
                                    </div>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
