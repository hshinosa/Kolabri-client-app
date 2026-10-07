import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { CalendarDays, Check, Menu, MessageSquare, Pencil, Plus, Send, Sparkles, Trash2, X, RefreshCw, FileText, Search, Copy, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


import AppLayout from '@/layouts/app-layout';
import student from '@/routes/student';
import { useStudentNav } from '@/components/navigation/student-nav';
import Breadcrumbs from '@/components/dashboard/Breadcrumbs';
import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { ChatSkeleton } from '@/components/ui/skeletons';
import { AiMessage, SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { formatAiOutput } from '@/lib/formatAiOutput';
import { fetchChatMessages } from '@/lib/fetchChatMessages';
import { sanitizeHtml } from '@/lib/sanitize';
import { SearchBar } from './components';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DocumentViewerModal, type DocumentViewerTarget } from '@/components/course/DocumentViewerModal';
import { buildPersistedOptimisticMessages } from './streaming-state';

// --- Memoized sub-components ---

interface CopyButtonProps { text: string; className?: string; }
function CopyButtonBase({ text, className = '' }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
    }, [text]);
    return (
        <button type="button" onClick={handleCopy} aria-label={copied ? 'Tersalin' : 'Salin pesan'}
            className={`inline-flex items-center gap-1 rounded-lg p-1 text-brand-muted-dark transition-colors hover:bg-white/80 hover:text-brand-primary ${className}`}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}
const CopyButton = memo(CopyButtonBase);

interface Citation { source: string; page?: number; snippet?: string; course_id?: string; course_material_id?: string; }
interface CitationListProps { citations: Array<Citation>; onOpenCitation: (cite: Citation) => void; }
function CitationListBase({ citations, onOpenCitation }: CitationListProps) {
    if (citations.length === 0) return null;
    return (
        <div className="mt-2 border-t border-gray-200 pt-2">
            <p className="mb-1 text-xs font-medium text-[#6B7280]">Sumber referensi:</p>
            <div className="space-y-1">
                {citations.map((c, i) => {
                    const hasDoc = c.course_id && c.course_material_id;
                    if (hasDoc) {
                        return (
                            <div key={i} className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onOpenCitation(c)}
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-brand-primary hover:bg-brand-primary/10 transition-colors cursor-pointer"
                                >
                                    <FileText className="h-2.5 w-2.5" />{c.source}{c.page ? ` (hal. ${c.page})` : ''}
                                </button>
                            </div>
                        );
                    }
                    return (
                        <div key={i} className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-[#4B5563]">
                                <FileText className="h-2.5 w-2.5" />{c.source}{c.page ? ` (hal. ${c.page})` : ''}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
const CitationList = memo(CitationListBase);

const PROSE_CLASS = "prose prose-sm max-w-none text-[#374151] leading-7 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:text-[#1f2937] [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-brand-primary [&_pre]:rounded-xl [&_pre]:bg-gray-50 [&_pre]:p-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1 [&_a]:text-brand-primary [&_a]:underline";

interface MessageItemProps {
    message: { id: string; role: 'user' | 'assistant'; content: string; created_at: string; citations?: Array<{ source: string; page?: number; snippet?: string; course_id?: string; course_material_id?: string }> };
    userInitial: string;
    formatTime: (dateString: string) => string;
    onOpenCitation: (cite: { source: string; page?: number; snippet?: string; course_id?: string; course_material_id?: string }) => void;
    onSaveReflection?: (content: string) => void;
}

function MessageItemBase({ message, userInitial, formatTime, onOpenCitation, onSaveReflection }: MessageItemProps) {
    const isAssistant = message.role === 'assistant';
    const isUser = message.role === 'user';
    const [codeCopied, setCodeCopied] = useState<string | null>(null);
    const handleCodeCopy = useCallback(async (code: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(code); setCodeCopied(code); setTimeout(() => setCodeCopied(null), 2000); } catch {}
    }, []);

    const markdownComponents = useMemo(() => ({
        pre({ children, ...props }: any) {
            let codeText = '';
            const extract = (n: any): string => { if (typeof n === 'string') return n; if (n?.props?.children) return extract(n.props.children); if (Array.isArray(n)) return n.map(extract).join(''); return ''; };
            codeText = extract(children);
            return (
                <div className="group relative">
                    <button type="button" onClick={(e) => handleCodeCopy(codeText, e)} aria-label="Salin kode"
                        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-lg bg-gray-200/80 p-1 text-xs text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-300">
                        {codeCopied === codeText ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <pre {...props}>{children}</pre>
                </div>
            );
        },
    }), [codeCopied, handleCodeCopy]);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} id={`message-${message.id}`} className={`flex gap-2.5 group ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: isUser ? 'linear-gradient(135deg, var(--color-brand-primary) 0%, #a41219 100%)' : 'rgba(136,22,28,0.08)', border: isUser ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(136,22,28,0.12)' }}>
                {isUser ? <span className="text-sm font-bold text-white">{userInitial}</span> : <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-brand-primary)' }} />}
            </div>
            <div className="max-w-[84%] rounded-[24px] px-4 py-3.5"
                style={{ background: isUser ? 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)' : 'rgba(255,255,255,0.82)', border: isUser ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.82)', boxShadow: '0 12px 26px rgba(148,163,184,0.10)' }}>
                {isAssistant ? (
                    <div className={PROSE_CLASS}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{sanitizeHtml(formatAiOutput(message.content))}</ReactMarkdown>
                    </div>
                ) : (
                    <p className="text-sm whitespace-pre-wrap leading-7 text-white">{message.content}</p>
                )}
                <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`text-xs ${isUser ? 'text-white/70' : 'text-brand-muted-dark'}`}>{formatTime(message.created_at)}</p>
                    {isAssistant && (
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={() => onSaveReflection?.(message.content)}
                                aria-label="Jadikan dasar refleksi"
                                title="Jadikan dasar refleksi"
                                className="inline-flex items-center gap-1 rounded-lg p-1 text-brand-muted-dark transition-colors hover:bg-white/80 hover:text-brand-primary"
                            >
                                <FileText className="h-3.5 w-3.5" />
                            </button>
                            <CopyButton text={message.content} />
                        </div>
                    )}
                </div>
                {isAssistant && message.citations && message.citations.length > 0 && <CitationList citations={message.citations} onOpenCitation={onOpenCitation} />}
            </div>
        </motion.div>
    );
}
const MessageItem = memo(MessageItemBase);

function formatDateSeparator(dateString: string): string {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hari Ini';
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function shouldShowDateSeparator(prev: string, curr: string): boolean {
    return new Date(prev).toDateString() !== new Date(curr).toDateString();
}

function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...fetchOptions, signal: controller.signal }).finally(() => clearTimeout(id));
}

interface AiChat {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages?: AiMessage[];
}

interface WeekOption {
    course_id: string;
    course_name: string;
    week_index: number;
    title: string;
}

interface Props {
    chats: AiChat[];
    activeChat: AiChat | null;
    weekOptions?: WeekOption[];
}

const headingStyle = {
    color: 'var(--color-brand-dark)',
} as const;

const bodyTextClass = 'text-sm text-gray-600';

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


export default function AiChatIndex({ chats, activeChat, weekOptions = [] }: Props) {
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
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [displayedStreamingContent, setDisplayedStreamingContent] = useState('');
    const [optimisticMessages, setOptimisticMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }>>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [loadedMessages, setLoadedMessages] = useState<AiMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [streamingCitations, setStreamingCitations] = useState<Array<{ source: string; page?: number; snippet?: string; course_id?: string; course_material_id?: string }>>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamingContentRef = useRef('');
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
    // Fokus materi per-minggu: "all" atau `${course_id}:${week_index}`
    const [focusKey, setFocusKey] = useState<string>('all');
    const focusWeek = useMemo(
        () => weekOptions.find((w) => `${w.course_id}:${w.week_index}` === focusKey) ?? null,
        [weekOptions, focusKey],
    );
    // Simpan jawaban AI sebagai draft refleksi (di-edit dulu mahasiswa sebelum submit)
    const handleSaveReflection = useCallback((content: string) => {
        sessionStorage.setItem('kolabri_reflection_draft', content);
        router.visit(student.reflections.index.url());
    }, []);
    const [documentViewer, setDocumentViewer] = useState<DocumentViewerTarget | null>(null);

    useEffect(() => {
        if (!activeChat?.id) {
            setLoadedMessages([]);
            return;
        }

        setIsLoadingMessages(true);
        setFetchError(null);
        fetchChatMessages(activeChat.id)
            .then((msgs) => {
                setLoadedMessages(msgs);
                // Server now holds the persisted user+assistant messages,
                // so the optimistic copies are redundant.
                if (msgs.length > 0) setOptimisticMessages([]);
            })
            .catch(err => setFetchError(err.message))
            .finally(() => setIsLoadingMessages(false));
    }, [activeChat?.id]);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const handleSearchSelect = useCallback((chatId: string) => {
        router.visit(student.aiChat.show.url({ chat: chatId }));
    }, []);

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

        let rafPending = false;
        const handleScroll = () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                setIsMessagesScrolling(true);
                const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 80;
                setShowScrollBtn(!isNearBottom);
                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = setTimeout(() => setIsMessagesScrolling(false), 900);
                rafPending = false;
            });
        };
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const readStream = async (resp: Response, onChunk: (text: string) => void, onCitations?: (citations: Array<{ source: string; page?: number; snippet?: string }>) => void) => {
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
                    if (parsed.type === 'citations' && parsed.citations && onCitations) {
                        onCitations(parsed.citations);
                        continue;
                    }
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
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    }), []);

    const displayedStreamingContentRef = useRef('');

    useEffect(() => {
        displayedStreamingContentRef.current = displayedStreamingContent;
    }, [displayedStreamingContent]);

    useEffect(() => {
        streamingContentRef.current = streamingContent;
    }, [streamingContent]);

    const doStream = async (chatId: string, content: string) => {
        setLastFailedPrompt(null);
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setOptimisticMessages([{ id: `opt-user-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }]);
        setIsStreaming(true);
        setStreamingContent('');
        setDisplayedStreamingContent('');
        setStreamingCitations([]);

        try {
            const resp = await fetch(`/student/ai-chat/${chatId}/messages/stream`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...apiHeaders, 'Accept': 'text/event-stream' },
                body: JSON.stringify({
                    content,
                    ...(focusWeek ? { week_index: focusWeek.week_index, focus_course_id: focusWeek.course_id } : {}),
                }),
                signal: controller.signal,
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
            }, (citations) => {
                setStreamingCitations(citations);
            });

            await waitForRevealToCatchUp(finalText);
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                setIsStreaming(false);
                setOptimisticMessages((prev) => {
                    const partialContent = displayedStreamingContentRef.current || streamingContentRef.current;

                    if (!partialContent) {
                        return prev;
                    }

                    return buildPersistedOptimisticMessages(
                        prev,
                        `${partialContent}\n\n_(Dihentikan oleh pengguna)_`,
                    );
                });
            } else {
                setLastFailedPrompt(content);
                setOptimisticMessages((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: 'assistant', content: 'Maaf, koneksi terputus. Silakan coba lagi.', created_at: new Date().toISOString() }]);
            }
        } finally {
            abortControllerRef.current = null;
            setIsStreaming(false);
            setOptimisticMessages((prev) =>
                buildPersistedOptimisticMessages(
                    prev,
                    displayedStreamingContentRef.current || streamingContentRef.current,
                ),
            );
        }
    };

    const doCreateAndStream = async (content: string) => {
        setLastFailedPrompt(null);
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setOptimisticMessages([{ id: `opt-user-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }]);
        setIsStreaming(true);
        setStreamingContent('');
        setDisplayedStreamingContent('');
        setStreamingCitations([]);

        try {
            const createResp = await fetchWithTimeout('/student/ai-chat', {
                method: 'POST',
                credentials: 'include',
                headers: apiHeaders,
                body: JSON.stringify({ title: content.substring(0, 50) }),
                timeout: 60000,
            });

            if (!createResp.ok) {
                setOptimisticMessages((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: 'assistant', content: 'Gagal membuat chat baru.', created_at: new Date().toISOString() }]);
                setIsStreaming(false);
                return;
            }

            const { data: newChat } = await createResp.json();
            const chatId = newChat.id;

            const streamResp = await fetch(`/student/ai-chat/${chatId}/messages/stream`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...apiHeaders, 'Accept': 'text/event-stream' },
                body: JSON.stringify({
                    content,
                    ...(focusWeek ? { week_index: focusWeek.week_index, focus_course_id: focusWeek.course_id } : {}),
                }),
                signal: controller.signal,
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
            }, (citations) => {
                setStreamingCitations(citations);
            });

            await waitForRevealToCatchUp(finalText);

            const finalAssistantContent = displayedStreamingContentRef.current || finalText;

            // Promote the streamed response to an optimistic assistant message so it
            // stays visible after isStreaming flips false. The fetch effect will
            // replace optimistic messages once the server messages arrive.
            setOptimisticMessages((prev) => [
                ...prev,
                { id: `sent-assistant-${Date.now()}`, role: 'assistant', content: finalAssistantContent, created_at: new Date().toISOString() },
            ]);

            // Preserve component state to avoid a visible "page refresh" flash.
            // Keep optimistic messages on screen until the server messages arrive
            // (the activeChat.id change triggers the fetch effect), then clear them.
            router.visit(student.aiChat.show.url({ chat: chatId }), {
                preserveState: true,
                only: ['chats', 'activeChat', 'flash', 'errors'],
                onSuccess: () => {
                    setIsStreaming(false);
                    setStreamingContent('');
                    setDisplayedStreamingContent('');
                },
            });
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                setIsStreaming(false);
            } else {
                setLastFailedPrompt(content);
                setOptimisticMessages((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: 'assistant', content: 'Maaf, koneksi terputus.', created_at: new Date().toISOString() }]);
                setIsStreaming(false);
            }
        } finally {
            abortControllerRef.current = null;
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

        const nextTitle = editingTitle.trim();
        if (!nextTitle) {
            titleForm.setError('title', 'Judul chat tidak boleh kosong.');
            return;
        }

        titleForm.clearErrors('title');
        titleForm.setData('title', nextTitle);

        titleForm.patch(student.aiChat.update.url({ chat: chatId }), {
            preserveScroll: true,
            preserveState: true,
            only: ['chats', 'activeChat', 'flash', 'errors'],
            onSuccess: () => {
                handleCancelRename();
            },
            onError: (errors) => {
                if (errors?.title) {
                    titleForm.setError('title', errors.title);
                }
            },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
    };
    const handleStopGeneration = useCallback(() => {
        if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
        setIsStreaming(false);
    }, []);
    const handleRetry = useCallback(() => {
        if (!lastFailedPrompt) return;
        setLastFailedPrompt(null); setInputValue(lastFailedPrompt);
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }, [lastFailedPrompt]);

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
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };
    const handleOpenCitation = useCallback((cite: { source: string; page?: number; snippet?: string; course_id?: string; course_material_id?: string }) => {
        if (!cite.course_id || !cite.course_material_id) return;
        const streamUrl = `/student/courses/${cite.course_id}/materials/${cite.course_material_id}/stream`;
        setDocumentViewer({
            title: cite.source,
            fileName: cite.source,
            streamUrl,
        });
    }, []);

    const handleCardClick = (prompt: string) => {
        if (isStreaming) return;
        setInputValue('');
        if (!activeChat) doCreateAndStream(prompt); else doStream(activeChat.id, prompt);
    };

    const breadcrumbItems = [{ label: 'Asisten AI' }];

    return (
        <AppLayout title="Asisten AI" navItems={navItems}>
            <Head title="Asisten AI" />
            <Breadcrumbs items={breadcrumbItems} />

            <div className="flex h-[calc(100vh-100px)] flex-col">
                <div className="flex items-center justify-end mb-3 gap-2">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/75 bg-white/72 px-3 py-2 text-sm font-medium text-brand-dark shadow-[0_12px_28px_rgba(148,163,184,0.14)] transition-colors hover:text-brand-primary"
                        title="Buka riwayat chat"
                    >
                        <Menu className="h-4 w-4" />
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
                                    <Sparkles className="h-6 w-6 text-brand-primary" />
                                </div>
                                <h2 className="text-center text-2xl font-bold leading-[1.15] tracking-[-0.02em] sm:text-3xl font-sans text-brand-dark">
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
                                    {isLoadingMessages && optimisticMessages.length === 0 ? (
                                        <ChatSkeleton messageCount={4} />
                                    ) : messages.map((message, index) => {
                                        const prevMessage = index > 0 ? messages[index - 1] : null;
                                        const showDateSep = !prevMessage || shouldShowDateSeparator(prevMessage.created_at, message.created_at);
                                        return (
                                            <div key={message.id}>
                                                {showDateSep && (
                                                    <div className="flex items-center justify-center py-2">
                                                        <span className="rounded-full bg-white/60 px-3 py-1 text-[11px] font-medium text-brand-muted-dark" style={{ border: '1px solid rgba(226,232,240,0.6)' }}>
                                                            {formatDateSeparator(message.created_at)}
                                                        </span>
                                                    </div>
                                                )}
                                                <MessageItem
                                                    message={message}
                                                    userInitial={authData.user?.name?.charAt(0).toUpperCase() || 'U'}
                                                    formatTime={formatTime}
                                                    onOpenCitation={handleOpenCitation}
                                                    onSaveReflection={handleSaveReflection}
                                                />
                                            </div>
                                        );
                                    })}
                                    {!isLoadingMessages && isStreaming && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-brand-primary)' }} />
                                            </div>
                                            <div className="max-w-[84%] rounded-[24px] px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.82)', boxShadow: '0 12px 26px rgba(148,163,184,0.10)' }}>
                                                {displayedStreamingContent ? (
                                                    <div className="prose prose-sm max-w-none text-[#374151] leading-7 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:text-[#1f2937] [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-brand-primary [&_pre]:rounded-xl [&_pre]:bg-gray-50 [&_pre]:p-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{sanitizeHtml(formatAiOutput(displayedStreamingContent))}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1 py-1">
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-muted-dark" style={{ animationDelay: '0ms' }} />
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-muted-dark" style={{ animationDelay: '150ms' }} />
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-muted-dark" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                )}
                                                {streamingCitations.length > 0 && (
                                                    <div className="mt-2 border-t border-gray-200 pt-2">
                                                        <p className="mb-1 text-xs font-medium text-[#6B7280]">Sumber referensi:</p>
                                                        <div className="space-y-1">
                                                            {streamingCitations.map((c, i) => {
                                                                const docUrl = c.course_id && c.course_material_id
                                                                    ? `/student/courses/${c.course_id}/materials/${c.course_material_id}/stream`
                                                                    : null;

                                                                return (
                                                                    <div key={i} className="flex items-center gap-1">
                                                                        {docUrl ? (
                                                                            <a
                                                                                href={docUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                                                            >
                                                                                <FileText className="h-2.5 w-2.5" />
                                                                                {c.source}{c.page ? ` (hal. ${c.page})` : ''}
                                                                            </a>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-[#4B5563]">
                                                                                <FileText className="h-2.5 w-2.5" />
                                                                                {c.source}{c.page ? ` (hal. ${c.page})` : ''}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {displayedStreamingContent ? null : (
                                                    <p className="mt-1 text-xs text-brand-muted-dark">AI sedang memproses…</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />

                                        {showScrollBtn && !isStreaming && (

                                            <button

                                                type="button"

                                                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}

                                                aria-label="Scroll ke bawah"

                                                className="sticky bottom-4 left-1/2 z-10 mx-auto flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-white text-brand-primary shadow-[0_8px_20px_rgba(148,163,184,0.18)] transition-colors hover:bg-brand-primary/5"

                                                style={{ border: '1px solid rgba(136,22,28,0.12)' }}

                                            >

                                                <ArrowDown className="h-4 w-4" />

                                            </button>

                                        )}
                                </div>
                            </LiquidGlassCard>
                        )}

                        {lastFailedPrompt && !isStreaming && (
                            <div className="mt-2 flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleRetry}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/12"
                                    style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.14)' }}
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    Coba ulangi pesan
                                </button>
                            </div>
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
                                                if (activeChat?.id) {
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
                                            <div className="rounded-2xl border px-3 py-2 text-sm font-medium text-brand-primary transition-opacity" style={{ background: 'rgba(136,22,28,0.06)', borderColor: 'rgba(136,22,28,0.14)' }}>
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
                                                onClick={() => handleCardClick(item.prompt)}
                                                className="rounded-full px-3 py-1.5 text-xs font-medium shadow-[0_8px_22px_rgba(148,163,184,0.08)] transition-colors hover:bg-[rgba(136,22,28,0.10)] sm:text-sm"
                                                style={{
                                                    color: 'var(--color-brand-primary)',
                                                    background: 'rgba(136,22,28,0.08)',
                                                    border: '1px solid rgba(136,22,28,0.14)',
                                                }}
                                            >
                                                {item.eyebrow}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {weekOptions.length > 0 && (
                                    <div className="mb-2 flex flex-wrap items-center gap-2 px-1 text-xs">
                                        <span className="text-brand-muted-dark">Fokus materi:</span>
                                        <select
                                            value={focusKey}
                                            onChange={(e) => setFocusKey(e.target.value)}
                                            aria-label="Fokus materi chat AI"
                                            className="rounded-lg border bg-white px-2 py-1 text-xs text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                            style={{ borderColor: 'rgba(226,232,240,0.9)' }}
                                        >
                                            <option value="all">Semua materi</option>
                                            {weekOptions.map((w) => (
                                                <option key={`${w.course_id}:${w.week_index}`} value={`${w.course_id}:${w.week_index}`}>
                                                    {w.course_name} · Minggu {w.week_index}: {w.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="rounded-[24px] border bg-white/92 px-3 py-2.5 shadow-[0_14px_32px_rgba(148,163,184,0.10)]" style={{ borderColor: 'rgba(226,232,240,0.9)' }}>
                                    <div className="flex items-center gap-2.5">
                                        <textarea
                                            ref={inputRef}
                                            value={inputValue}
                                            onChange={(e) => { setInputValue(e.target.value); setInputError(''); }}
                                            onKeyDown={handleKeyDown}
                                            placeholder={isEmptyState ? 'Tanyakan apa saja tentang tugas, ide, atau rencana belajarmu' : 'Ketik pesan...'}
                                            rows={1}
                                            className="min-h-[40px] max-h-[120px] flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2.5 text-sm leading-6 text-[#374151] placeholder-[#7B8494] focus:outline-none"
                                            aria-label="Input pesan AI chat"
                                            style={{ height: '40px' }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                                            }}
                                        />
                                        {isStreaming ? (
                                            <button
                                                type="button"
                                                onClick={handleStopGeneration}
                                                aria-label="Hentikan generasi"
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-center rounded-full text-white transition-all"
                                                style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.92) 0%, rgba(185,28,28,0.96) 100%)', boxShadow: '0 10px 20px rgba(220,38,38,0.16)' }}
                                            >
                                                <span className="h-3.5 w-3.5 rounded-sm bg-white" />
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                disabled={!inputValue.length}
                                                aria-label="Kirim pesan"
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-center rounded-full text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                    boxShadow: '0 10px 20px rgba(136,22,28,0.16)',
                                                }}
                                            >
                                                <Send className="h-4.5 w-4.5" />
                                            </button>
                                        )}
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
                                        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted-dark">Percakapan</p>
                                        <h3 className="mt-1 text-base font-semibold font-sans text-brand-dark">
                                            Riwayat AI
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSidebarOpen(false)}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-brand-muted-dark transition-colors hover:text-brand-primary"
                                        title="Tutup sidebar"
                                    >
                                        <X className="h-4.5 w-4.5" />
                                    </button>
                                </div>

                                <PrimaryButton onClick={handleNewChat} className="mt-4 w-full justify-center px-4 py-3 text-sm">
                                    <Plus className="h-4 w-4" />
                                    Chat Baru
                                </PrimaryButton>

                                <div className="mt-3">
                                    <SearchBar
                                        onSelectResult={handleSearchSelect}
                                        className="w-full"
                                    />
                                </div>

                                <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
                                    {safeChats.length === 0 ? (
                                        <div className="rounded-2xl border px-4 py-6 text-center" style={{ borderColor: 'rgba(136,22,28,0.10)', background: 'rgba(255,255,255,0.55)' }}>
                                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                <MessageSquare className="h-5 w-5" style={{ color: 'var(--color-brand-primary)' }} />
                                            </div>
                                            <p className="text-sm font-medium text-brand-dark">Belum ada percakapan</p>
                                            <p className="mt-1 text-xs text-brand-muted-dark">Mulai chat baru untuk bertanya kepada AI.</p>
                                        </div>
                                    ) : (
                                        safeChats.map((chat) => (
                                            <div
                                                key={chat.id}
                                                className={`group relative rounded-2xl border p-2.5 transition-colors ${activeChat?.id === chat.id ? 'bg-white/80' : 'bg-white/45 hover:bg-white/72'}`}
                                                style={{ borderColor: activeChat?.id === chat.id ? 'rgba(136,22,28,0.15)' : 'rgba(255,255,255,0.55)' }}
                                            >
                                                {editingChatId === chat.id ? (
                                                    <div className="flex items-start gap-3 pr-16" onClick={(e) => e.stopPropagation()}>
                                                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                            <MessageSquare className="h-4 w-4" style={{ color: 'var(--color-brand-primary)' }} />
                                                        </div>
                                                        <div className="min-w-0 flex-1 space-y-2">
                                                            <input
                                                                autoFocus
                                                                value={editingTitle}
                                                                onChange={(e) => {
                                                                    setEditingTitle(e.target.value);
                                                                    titleForm.setData('title', e.target.value);
                                                                    if (titleForm.errors.title) {
                                                                        titleForm.clearErrors('title');
                                                                    }
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onMouseDown={(e) => e.stopPropagation()}
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
                                                                className="w-full rounded-xl border border-[rgba(136,22,28,0.16)] bg-white/90 px-3 py-2 text-sm font-medium text-brand-dark outline-none"
                                                            />
                                                            {titleForm.errors.title && (
                                                                <p className="text-xs font-medium text-red-600">{titleForm.errors.title}</p>
                                                            )}
                                                            <p className="text-xs text-brand-muted-dark">{formatDate(chat.updated_at)}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Link href={student.aiChat.show.url({ chat: chat.id })} className="flex items-start gap-3 pr-16" onClick={() => setSidebarOpen(false)}>
                                                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}>
                                                            <MessageSquare className="h-4 w-4" style={{ color: 'var(--color-brand-primary)' }} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className={`truncate text-sm font-medium ${activeChat?.id === chat.id ? 'text-brand-primary' : 'text-brand-dark'}`}>
                                                                {chat.title || 'Chat Baru'}
                                                            </p>
                                                            <p className="mt-1 text-xs text-brand-muted-dark">{formatDate(chat.updated_at)}</p>
                                                        </div>
                                                    </Link>
                                                )}
                                                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                                                    {editingChatId === chat.id ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleSubmitRename(chat.id);
                                                                }}
                                                                className="rounded-lg p-1 text-emerald-600 transition-colors hover:bg-white/80"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleCancelRename();
                                                                }}
                                                                className="rounded-lg p-1 text-brand-muted-dark transition-colors hover:bg-white/80 hover:text-brand-primary"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleStartRename(chat);
                                                                }}
                                                                className="rounded-lg p-1 text-brand-muted-dark transition-colors hover:bg-white/80 hover:text-brand-primary"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setShowDeleteModal(chat.id);
                                                                }}
                                                                className="rounded-lg p-1 text-brand-muted-dark transition-colors hover:bg-white/80 hover:text-brand-primary"
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
            <ConfirmDialog
                open={Boolean(showDeleteModal)}
                title="Hapus Percakapan?"
                message="Percakapan ini akan dihapus secara permanen dan tidak dapat dikembalikan."
                confirmLabel="Hapus"
                cancelLabel="Batal"
                onConfirm={() => showDeleteModal && handleDeleteChat(showDeleteModal)}
                onCancel={() => setShowDeleteModal(null)}
                variant="danger"
            />

            <DocumentViewerModal
                open={documentViewer !== null}
                target={documentViewer}
                onClose={() => setDocumentViewer(null)}
            />
        </AppLayout>
    );
}
