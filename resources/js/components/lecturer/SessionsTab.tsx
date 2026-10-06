import { ChevronDown, ChevronRight, FileText, MessagesSquare, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { LiquidGlassCard } from '@/components/Welcome/utils/helpers';
import { DiscussionHealthWidget } from '@/components/lecturer/DiscussionHealthWidget';
import { toast } from '@/components/ui/toaster';

interface SessionRow {
    id: string;
    name: string;
    description: string | null;
    groupId: string;
    groupName: string;
    membersCount: number;
    weekId: string | null;
    weekIndex: number | null;
    weekTitle: string | null;
    createdAt: string;
    closedAt: string | null;
    hasGoal: boolean;
    goal: string | null;
    hasSummary: boolean;
    summaryGeneratedAt: string | null;
    reflectionsCount: number;
}

interface SessionAnalytics {
    metrics?: {
        totalMessages?: number;
        studentMessages?: number;
        aiMentions?: number;
        interventions?: number;
        goalsCount?: number;
        reflectionsCount?: number;
    };
    participantStats?: Record<string, { messageCount: number; avgLength: number }>;
    groupAnalytics?: {
        qualityScore?: number | null;
        recommendation?: string | null;
        engagementDistribution?: Record<string, number>;
    };
    timeline?: Array<{ senderName?: string; content?: string; createdAt?: string; senderType?: string }>;
}

interface SessionDetail {
    analytics: SessionAnalytics;
    summary: string | null;
    summary_generated_at: string | null;
}

const headingStyle = { color: 'var(--color-brand-dark)' } as const;
const bodyTextClass = 'text-sm text-brand-muted-dark';

function qualityColor(score: number | null | undefined): string {
    if (score === null || score === undefined) return '#6B7280';
    if (score >= 70) return '#16a34a';
    if (score >= 40) return '#d97706';
    return '#b91c1c';
}

function qualityLabel(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'Belum ada data';
    if (score >= 70) return 'Baik';
    if (score >= 40) return 'Cukup';
    return 'Perlu Perhatian';
}

function formatDate(value: string | null): string {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return value;
    }
}

export default function SessionsTab({ courseId }: { courseId: string }) {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);
    const [details, setDetails] = useState<Record<string, SessionDetail>>({});
    const [detailLoading, setDetailLoading] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch(`/lecturer/courses/${courseId}/sessions`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setSessions(Array.isArray(data.data) ? data.data : []);
        } catch {
            toast.error('Gagal memuat daftar sesi diskusi');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const loadDetail = useCallback(
        async (sessionId: string) => {
            if (details[sessionId]) return;
            setDetailLoading(sessionId);
            try {
                const res = await fetch(`/lecturer/courses/${courseId}/sessions/${sessionId}/detail`, {
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setDetails((prev) => ({ ...prev, [sessionId]: data }));
            } catch {
                toast.error('Gagal memuat analisis sesi');
            } finally {
                setDetailLoading(null);
            }
        },
        [courseId, details],
    );

    const toggle = useCallback(
        (sessionId: string) => {
            const next = openId === sessionId ? null : sessionId;
            setOpenId(next);
            if (next) void loadDetail(next);
        },
        [openId, loadDetail],
    );

    return (
        <div className="flex flex-col gap-5">
            {/* Kesehatan sesi yang sedang berjalan (komponen ini sebelumnya tak pernah dipakai) */}
            <DiscussionHealthWidget />

            <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(136,22,28,0.08)' }}>
                            <MessagesSquare className="h-5 w-5" style={{ color: '#88161c' }} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold" style={headingStyle}>
                                Sesi Diskusi & Analisis
                            </h3>
                            <p className={bodyTextClass}>Ringkasan AI dan hasil analisis setiap sesi, langsung dari diskusi mahasiswa.</p>
                        </div>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'rgba(136,22,28,0.08)', color: '#88161c' }}>
                        {sessions.length} sesi
                    </span>
                </div>

                {loading && <p className={bodyTextClass}>Memuat sesi diskusi…</p>}

                {!loading && sessions.length === 0 && (
                    <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: 'rgba(136,22,28,0.20)' }}>
                        <p className={bodyTextClass}>Belum ada sesi diskusi di kelas ini.</p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {sessions.map((s) => {
                        const isOpen = openId === s.id;
                        const detail = details[s.id];
                        const score = detail?.analytics?.groupAnalytics?.qualityScore ?? null;
                        return (
                            <div
                                key={s.id}
                                className="rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.65)' }}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggle(s.id)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-sm font-semibold" style={headingStyle}>
                                                {s.name}
                                            </span>
                                            <span
                                                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                                                style={
                                                    s.closedAt
                                                        ? { background: 'rgba(107,114,128,0.12)', color: '#6B7280' }
                                                        : { background: 'rgba(34,197,94,0.12)', color: '#166534' }
                                                }
                                            >
                                                {s.closedAt ? 'Ditutup' : 'Berjalan'}
                                            </span>
                                            {s.hasSummary && (
                                                <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(136,22,28,0.08)', color: '#88161c' }}>
                                                    Ada ringkasan
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 truncate text-xs" style={{ color: '#6B7280' }}>
                                            {s.groupName} · {s.weekTitle ? `Minggu ${s.weekIndex}: ${s.weekTitle}` : 'Tanpa minggu'} · dibuat {formatDate(s.createdAt)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isOpen && detail && (
                                            <span className="text-sm font-bold" style={{ color: qualityColor(score) }}>
                                                {score === null || score === undefined ? '—' : `${Math.round(score)}`}
                                            </span>
                                        )}
                                        {isOpen ? (
                                            <ChevronDown className="h-4 w-4" style={{ color: '#6B7280' }} />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" style={{ color: '#6B7280' }} />
                                        )}
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="border-t px-4 py-4" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                                        {detailLoading === s.id && !detail && <p className={bodyTextClass}>Memuat analisis…</p>}

                                        {detail && (
                                            <div className="flex flex-col gap-4">
                                                {/* Tujuan & ringkasan */}
                                                <div className="flex flex-col gap-3">
                                                    {s.goal && (
                                                        <div className="rounded-xl p-3" style={{ background: 'rgba(136,22,28,0.05)' }}>
                                                            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#88161c' }}>
                                                                <Target className="h-3.5 w-3.5" /> Tujuan Pembelajaran
                                                            </p>
                                                            <p className="text-sm" style={headingStyle}>
                                                                {s.goal}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#88161c' }}>
                                                            <Sparkles className="h-3.5 w-3.5" /> Ringkasan AI
                                                            {detail.summary_generated_at && (
                                                                <span className="font-normal" style={{ color: '#6B7280' }}>
                                                                    · {formatDate(detail.summary_generated_at)}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {detail.summary ? (
                                                            <p className="whitespace-pre-wrap text-sm" style={{ color: '#4A4A4A' }}>
                                                                {detail.summary}
                                                            </p>
                                                        ) : (
                                                            <p className="text-sm" style={{ color: '#6B7280' }}>
                                                                Belum ada ringkasan — ringkasan dibuat otomatis saat sesi ditutup.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Analisis */}
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#88161c' }}>
                                                            <TrendingUp className="h-3.5 w-3.5" /> Kualitas Diskusi
                                                        </p>
                                                        <p className="text-2xl font-bold" style={{ color: qualityColor(score) }}>
                                                            {score === null || score === undefined ? '—' : Math.round(score)}
                                                            <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                                                                /100 · {qualityLabel(score)}
                                                            </span>
                                                        </p>
                                                        {detail.analytics.groupAnalytics?.recommendation && (
                                                            <p className="mt-2 text-sm" style={{ color: '#4A4A4A' }}>
                                                                {detail.analytics.groupAnalytics.recommendation}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#88161c' }}>
                                                            <FileText className="h-3.5 w-3.5" /> Metrik Sesi
                                                        </p>
                                                        <ul className="grid grid-cols-2 gap-1 text-sm" style={{ color: '#4A4A4A' }}>
                                                            <li>Total pesan: <b>{detail.analytics.metrics?.totalMessages ?? 0}</b></li>
                                                            <li>Pesan mahasiswa: <b>{detail.analytics.metrics?.studentMessages ?? 0}</b></li>
                                                            <li>Panggilan @ai: <b>{detail.analytics.metrics?.aiMentions ?? 0}</b></li>
                                                            <li>Intervensi: <b>{detail.analytics.metrics?.interventions ?? 0}</b></li>
                                                            <li>Refleksi: <b>{s.reflectionsCount}</b></li>
                                                            <li>Anggota: <b>{s.membersCount}</b></li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                {/* Kontribusi per mahasiswa */}
                                                {detail.analytics.participantStats &&
                                                    Object.keys(detail.analytics.participantStats).length > 0 && (
                                                        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#88161c' }}>
                                                                <Users className="h-3.5 w-3.5" /> Kontribusi Mahasiswa
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Object.entries(detail.analytics.participantStats).map(([name, stat]) => (
                                                                    <span
                                                                        key={name}
                                                                        className="rounded-full px-3 py-1 text-xs"
                                                                        style={{ background: 'rgba(136,22,28,0.07)', color: '#4A4A4A' }}
                                                                    >
                                                                        <b>{name}</b> · {stat.messageCount} pesan · rata-rata {stat.avgLength} karakter
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </LiquidGlassCard>
        </div>
    );
}
