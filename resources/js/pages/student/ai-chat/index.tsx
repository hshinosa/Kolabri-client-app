import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Menu, MessageSquare, Plus, Send, Sparkles, Trash2 } from 'lucide-react';

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

export default function AiChatIndex({ chats, activeChat }: Props) {
    const { auth: authData } = usePage<SharedData>().props;
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const safeChats = chats ?? [];
    const messages = activeChat?.messages ?? [];

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
    const shellBackground = 'rgba(240,233,239,0.98)';
    const panelBackground = 'rgba(255,255,255,0.98)';

    return (
        <div 
            className="relative flex h-screen overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, #eee8eb 0%, #dfd8e6 50%, #e7dde1 100%)',
            }}
        >
            <Head title="Chat dengan AI" />

            {/* Sidebar - Conversation History */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 316, opacity: 1 }}
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
                                <Link
                                    href={student.courses.index.url()}
                                    className="flex items-center gap-2 text-[#4B5563] transition-colors hover:text-[#88161c]"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                    <span className="text-sm font-medium">Kembali</span>
                                </Link>
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
            <div className="flex flex-1 flex-col">
                {/* Chat Header */}
                <div className="border-b" style={{ background: 'rgba(240,233,239,0.98)', borderColor: 'rgba(136,22,28,0.10)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', boxShadow: '0 12px 30px rgba(148,163,184,0.12)' }}>
                    <header className="flex h-16 items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-white/60 hover:text-[#88161c]"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div 
                                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <Sparkles className="h-5 w-5" style={{ color: '#88161c' }} />
                                </div>
                                <div>
                                    <h1 className="text-base font-bold" style={headingStyle}>
                                        AI Assistant
                                    </h1>
                                    <p className="text-xs text-[#4B5563]">Siap membantu pembelajaran Anda</p>
                                </div>
                            </div>
                        </div>
                        {activeChat && (
                            <span className="rounded-full px-3 py-1 text-xs text-[#4B5563]" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.7)' }}>{activeChat.title}</span>
                        )}
                    </header>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center px-4 text-center">
                            <LiquidGlassCard intensity="medium" className="w-full max-w-[640px] px-8 py-14 text-center shadow-[0_28px_72px_rgba(148,163,184,0.16)]" lightMode={true} style={{ background: 'rgba(255,255,255,0.99)', border: '1px solid rgba(136,22,28,0.10)' }}>
                                <div 
                                    className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <Sparkles className="h-8 w-8" style={{ color: '#88161c' }} />
                                </div>
                                <h2 className="text-3xl font-bold" style={headingStyle}>
                                    Halo! Saya AI Assistant
                                </h2>
                                <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-[#4B5563]">
                                    Saya siap membantu Anda dengan pertanyaan seputar mata kuliah, tugas, atau konsep pembelajaran lainnya.
                                </p>
                                <div className="mx-auto mt-8 grid w-full max-w-[560px] gap-3 sm:grid-cols-2">
                                    {[
                                        { icon: '📚', text: 'Jelaskan konsep pembelajaran kooperatif' },
                                        { icon: '💡', text: 'Bantu saya memahami materi ini' },
                                        { icon: '📝', text: 'Berikan contoh untuk tugas saya' },
                                        { icon: '🎯', text: 'Tips untuk belajar efektif' },
                                    ].map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => messageForm.setData('content', suggestion.text)}
                                            className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-white/90"
                                            style={{
                                                borderColor: 'rgba(136,22,28,0.10)',
                                                background: 'rgba(255,255,255,0.99)',
                                                boxShadow: '0 14px 30px rgba(148,163,184,0.12)',
                                            }}
                                        >
                                            <span className="text-lg">{suggestion.icon}</span>
                                            <span className="text-[#4A4A4A]">{suggestion.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </LiquidGlassCard>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-3xl space-y-4">
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
                                        className="max-w-[80%] rounded-2xl px-4 py-3"
                                        style={{
                                            background: message.role === 'user'
                                                ? '#88161c'
                                                : 'rgba(255,255,255,0.6)',
                                            border: message.role === 'user'
                                                ? '1px solid rgba(255,255,255,0.18)'
                                                : '1px solid rgba(255,255,255,0.5)',
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
                <div className="border-t" style={{ background: 'rgba(240,233,239,0.98)', borderColor: 'rgba(136,22,28,0.10)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', boxShadow: '0 -12px 30px rgba(148,163,184,0.12)' }}>
                    <form onSubmit={handleSendMessage} className="mx-auto max-w-3xl p-4">
                        <div 
                            className="relative flex items-end gap-3 rounded-[28px] p-3"
                            style={{
                                background: 'rgba(255,255,255,0.99)',
                                border: '1px solid rgba(136,22,28,0.10)',
                                boxShadow: '0 16px 34px rgba(148,163,184,0.12)',
                            }}
                        >
                            <textarea
                                ref={inputRef}
                                value={messageForm.data.content}
                                onChange={(e) => messageForm.setData('content', e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ketik pesan Anda..."
                                rows={1}
                                className="max-h-32 min-h-[48px] flex-1 resize-none bg-transparent px-4 py-3 text-sm text-[#4A4A4A] placeholder-[#6B7280] focus:outline-none"
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
                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                    boxShadow: '0 10px 24px rgba(136,22,28,0.24)',
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
