import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, CalendarDays, MessageSquare, Plus, Send, Sparkles, Trash2 } from 'lucide-react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { AiMessage, SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import student from '@/routes/student';
import { useStudentNav } from '@/components/navigation/student-nav';
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
    const navItems = useStudentNav('ai-chat');
    const [sidebarOpen, setSidebarOpen] = useState(true);
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
                background: 'linear-gradient(135deg, #f5f0f0 0%, #e8e4f0 50%, #f0e8e8 100%)',
            }}
        >
            <Head title="Chat dengan AI" />

            <aside
                className="hidden w-72 flex-shrink-0 lg:block"
                style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.5)',
                }}
            >
                <div className="flex h-full flex-col">
                    <div className="flex h-20 items-center gap-3 px-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.5)' }}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                            <img src="/LogoKolabri.webp" alt="Kolabri" className="h-8 w-8" />
                        </div>
                        <div>
                            <span className="text-xl font-bold" style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Kolabri</span>
                            <p className="text-xs text-[#6B7280]">Platform Kolaborasi</p>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
                        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Menu</p>
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                                    item.active ? 'text-[#88161c]' : 'text-[#4A4A4A] hover:text-[#88161c]'
                                }`}
                                style={{
                                    background: item.active ? 'rgba(136,22,28,0.08)' : 'transparent',
                                    border: item.active ? '1px solid rgba(136,22,28,0.15)' : '1px solid transparent',
                                }}
                            >
                                <span className={item.active ? 'text-[#88161c]' : 'text-[#6B7280]'}>{item.icon}</span>
                                {item.name}
                                {item.active && <span className="ml-auto h-2 w-2 rounded-full bg-[#88161c]" />}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.5)' }}>
                        <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(255, 255, 255, 0.4)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full font-bold text-white" style={{ background: 'linear-gradient(135deg, #88161c 0%, #a41219 100%)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {authData.user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-[#4A4A4A]">{authData.user?.name || 'User'}</p>
                                <p className="truncate text-xs capitalize text-[#6B7280]">{authData.user?.role || 'student'}</p>
                            </div>
                            <Link
                                href={auth.logout.url()}
                                method="post"
                                as="button"
                                className="rounded-xl p-2 text-[#6B7280] transition-colors hover:text-[#88161c]"
                                style={{ background: 'rgba(255, 255, 255, 0.5)' }}
                                title="Keluar"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="flex flex-1 flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">
                    <div className="mb-4 lg:hidden">
                        <Link
                            href={student.courses.index.url()}
                            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#4A4A4A]"
                            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)' }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Kembali
                        </Link>
                    </div>

            <div className="space-y-6">
                <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold" style={headingStyle}>
                                Chat dengan AI
                            </h1>
                            <p className="mt-1 text-sm text-[#6B7280]">
                                Pengalaman AI yang tetap terasa spesial, tetapi selaras dengan halaman student lainnya.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <SecondaryButton onClick={() => setSidebarOpen((value) => !value)}>
                                <MessageSquare className="h-4 w-4" />
                                {sidebarOpen ? 'Sembunyikan Riwayat' : 'Lihat Riwayat'}
                            </SecondaryButton>
                            <PrimaryButton onClick={handleNewChat}>
                                <Plus className="h-4 w-4" />
                                Chat Baru
                            </PrimaryButton>
                        </div>
                    </div>
                </LiquidGlassCard>

                <div className={`grid gap-6 ${sidebarOpen ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
                    <div className="space-y-6">
                        {messages.length === 0 ? (
                            <>
                                <LiquidGlassCard intensity="medium" className="overflow-hidden p-6 lg:p-8" lightMode={true}>
                                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                                        <div>
                                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[#88161c]" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.15)' }}>
                                                <Sparkles className="h-3.5 w-3.5" />
                                                AI Assistant
                                            </div>
                                            <h2 className="mt-5 text-4xl font-bold leading-tight md:text-5xl" style={headingStyle}>
                                                Hi {userFirstName}, ready to make progress today?
                                            </h2>
                                            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6B7280]">
                                                Gunakan AI untuk merangkum materi, memecah tugas, dan menjaga fokus belajar — dengan tampilan yang tetap menyatu dengan ekosistem student Kolabri.
                                            </p>
                                        </div>

                                        <div className="relative mx-auto w-full max-w-[220px]">
                                            <div className="absolute right-0 top-0 rounded-2xl bg-white/90 px-4 py-3 text-sm font-medium text-[#4A4A4A] shadow-[0_16px_34px_rgba(148,163,184,0.16)]">
                                                Siap bantu ✨<br />
                                                Mulai dari pertanyaanmu.
                                            </div>
                                            <div className="mx-auto mt-12 flex h-[200px] w-[180px] items-center justify-center rounded-[36px] border border-[rgba(136,22,28,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,239,244,0.88)_100%)]">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="flex h-20 w-20 items-center justify-center rounded-[28px]" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                        <Bot className="h-10 w-10" style={{ color: '#88161c' }} />
                                                    </div>
                                                    <div className="h-12 w-24 rounded-[20px] border border-white/80 bg-white/70" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </LiquidGlassCard>

                                <div className="grid gap-4 md:grid-cols-3">
                                    {emptyStateCards.map((card, index) => (
                                        <motion.button
                                            key={card.title}
                                            type="button"
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.06, duration: 0.3 }}
                                            onClick={() => prefillPrompt(card.prompt)}
                                            className="text-left"
                                        >
                                            <LiquidGlassCard intensity="light" className="h-full p-6 transition-transform duration-200 hover:-translate-y-1" lightMode={true}>
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                    <card.icon className="h-6 w-6" style={{ color: '#88161c' }} />
                                                </div>
                                                <p className="mt-5 text-lg font-semibold leading-8 text-[#4A4A4A]">{card.title}</p>
                                                <p className="mt-4 text-sm font-medium text-[#6B7280]">{card.eyebrow}</p>
                                            </LiquidGlassCard>
                                        </motion.button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <LiquidGlassCard intensity="light" className="p-6 lg:p-8" lightMode={true}>
                                <div className="space-y-4">
                                    {messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                        >
                                            <div
                                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
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
                                                    <Sparkles className="h-4 w-4" style={{ color: '#88161c' }} />
                                                )}
                                            </div>
                                            <div
                                                className="max-w-[82%] rounded-3xl px-5 py-4"
                                                style={{
                                                    background: message.role === 'user'
                                                        ? 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)'
                                                        : 'rgba(255,255,255,0.72)',
                                                    border: message.role === 'user'
                                                        ? '1px solid rgba(255,255,255,0.18)'
                                                        : '1px solid rgba(255,255,255,0.6)',
                                                    boxShadow: '0 14px 30px rgba(148,163,184,0.10)',
                                                }}
                                            >
                                                <p className={`text-sm whitespace-pre-wrap ${message.role === 'user' ? 'text-white' : 'text-[#4A4A4A]'}`}>
                                                    {message.content}
                                                </p>
                                                <p className={`mt-1 text-xs ${message.role === 'user' ? 'text-white/70' : 'text-[#6B7280]'}`}>
                                                    {formatTime(message.created_at)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {isTyping && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                <Sparkles className="h-4 w-4" style={{ color: '#88161c' }} />
                                            </div>
                                            <div className="rounded-3xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
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

                        <LiquidGlassCard intensity="medium" className="p-4 lg:p-5" lightMode={true}>
                            <form onSubmit={handleSendMessage}>
                                <div className="flex items-center justify-between gap-4 px-2 pb-3 text-sm text-[#6B7280]">
                                    <span className="inline-flex items-center gap-2 rounded-full px-2 py-1">
                                        <Sparkles className="h-4 w-4" />
                                        AI Assistant untuk mahasiswa
                                    </span>
                                    <span className="hidden items-center gap-2 rounded-full px-2 py-1 sm:inline-flex">
                                        <Bot className="h-4 w-4" />
                                        Terhubung dengan pengalaman belajar Anda
                                    </span>
                                </div>
                                <div className="rounded-[28px] border bg-white/85 px-3 py-3" style={{ borderColor: 'rgba(226,232,240,0.85)' }}>
                                    <div className="flex items-end gap-3">
                                        <button
                                            type="button"
                                            onClick={handleNewChat}
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#6B7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#88161c]"
                                            title="Chat baru"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                        <textarea
                                            ref={inputRef}
                                            value={messageForm.data.content}
                                            onChange={(e) => messageForm.setData('content', e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder='Contoh: “Jelaskan konsep ini dengan sederhana”'
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
                                                background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                boxShadow: '0 12px 28px rgba(136,22,28,0.18)',
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
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 px-1">
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
                                            className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-[rgba(136,22,28,0.10)]"
                                            style={{
                                                color: '#88161c',
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.14)',
                                            }}
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-3 text-center text-xs text-[#6B7280]">
                                    Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
                                </p>
                            </form>
                        </LiquidGlassCard>
                    </div>

                    {sidebarOpen && (
                        <LiquidGlassCard intensity="light" className="h-fit p-4 lg:p-5" lightMode={true}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Percakapan</p>
                                    <h3 className="mt-1 text-lg font-semibold" style={headingStyle}>
                                        Riwayat AI
                                    </h3>
                                </div>
                                <SecondaryButton onClick={() => setSidebarOpen(false)}>
                                    Tutup
                                </SecondaryButton>
                            </div>

                            <div className="mt-4 space-y-2">
                                {safeChats.length === 0 ? (
                                    <div className="rounded-2xl border px-4 py-8 text-center" style={{ borderColor: 'rgba(136,22,28,0.10)', background: 'rgba(255,255,255,0.55)' }}>
                                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                            <MessageSquare className="h-6 w-6" style={{ color: '#88161c' }} />
                                        </div>
                                        <p className="text-sm font-medium text-[#4A4A4A]">Belum ada percakapan</p>
                                        <p className="mt-1 text-xs text-[#6B7280]">Mulai chat baru untuk bertanya kepada AI.</p>
                                    </div>
                                ) : (
                                    safeChats.map((chat) => (
                                        <div
                                            key={chat.id}
                                            className={`group relative rounded-2xl border p-3 transition-colors ${activeChat?.id === chat.id ? 'bg-white/80' : 'bg-white/45 hover:bg-white/72'}`}
                                            style={{ borderColor: activeChat?.id === chat.id ? 'rgba(136,22,28,0.15)' : 'rgba(255,255,255,0.55)' }}
                                        >
                                            <Link href={student.aiChat.show.url({ chat: chat.id })} className="flex items-start gap-3 pr-10">
                                                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                    <MessageSquare className="h-4 w-4" style={{ color: '#88161c' }} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`truncate text-sm font-medium ${activeChat?.id === chat.id ? 'text-[#88161c]' : 'text-[#4A4A4A]'}`}>
                                                        {chat.title || 'Chat Baru'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[#6B7280]">{formatDate(chat.updated_at)}</p>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => setShowDeleteModal(chat.id)}
                                                className="absolute right-2 top-2 hidden rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-white/80 hover:text-[#88161c] group-hover:block"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </LiquidGlassCard>
                    )}
                </div>
            </div>
                </main>
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
