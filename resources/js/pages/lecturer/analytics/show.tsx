import { Head, Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    BarChart3,
    Clock3,
    Info,
    Lightbulb,
    MessageSquare,
    Users,
    X,
} from 'lucide-react';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

import { io, Socket } from 'socket.io-client';
import { resolveSocketUrl } from '@/lib/socket-url';

import { LiquidGlassCard, OrganicBlob } from '@/components/Welcome/utils/helpers';
import { BaseModal } from '@/components/ui/BaseModal';
import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import MetricBreakdownTable from '@/components/MetricBreakdownTable';
import MetricsRadarChart from '@/components/MetricsRadarChart';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course } from '@/types';
import { getAuthToken } from '@/lib/getAuthToken';
import { toast } from '@/components/ui/toaster';
import {
    ENGAGEMENT_TYPE_EXPLANATIONS,
    QUALITY_METRIC_EXPLANATIONS,
    RADAR_METRIC_DEFINITIONS,
    RADAR_METRIC_LABELS,
} from '@/lib/analytics-metric-explanations';


interface Member {
    id: string;
    name: string;
    email: string;
}

interface SessionDiscussion {
    id: string;
    name: string;
    isClosed: boolean;
    closedAt?: string;
    createdAt: string;
}

interface QualityBreakdown {
    lexical_score?: number;
    hot_score?: number;
    cognitive_ratio?: number;
    lexical_variety?: number;
    hot_percentage?: number;
    participation?: number;
}

interface SrlDistributionData {
    distribution: { forethought: number; performance: number; reflection: number };
    total: number;
    avgConfidence: number | null;
    subPhases?: Record<string, number>;
    recent?: Array<{ phase: string | null; subPhase: string | null; confidence: number | null; at: string; text: string }>;
}

interface GroupAnalyticsData {
    qualityScore?: number;
    recommendation?: string;
    engagementDistribution?: Record<string, number>;
    qualityBreakdown?: QualityBreakdown;
    hotPercentage?: number;
    local_message_count?: number;
    /** Distribusi fase SRL Zimmerman asli (dari classifier ai-engine) */
    srl?: SrlDistributionData | null;
}

interface RecentActivity {
    id: string;
    senderName: string;
    senderType: string;
    content: string;
    createdAt: string;
    isIntervention: boolean;
    interventionType?: string;
    interventionReason?: string;
    scaffoldingLevel?: string;
    guardrailOutcome?: string;
    guardrailReason?: string;
}

interface Props {
    course: Course;
    group: {
        id: string;
        name: string;
        memberCount: number;
        sessionDiscussionCount: number;
    };
    analytics: GroupAnalyticsData;
    members: Member[];
    sessionDiscussions: SessionDiscussion[];
    recentActivity: RecentActivity[];
}

const headingStyle = {
    color: 'var(--color-brand-dark)',
} as const;

const bodyTextClass = 'text-sm leading-6 text-brand-muted-dark';

const badgeClass = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium';

const brandChipStyle = {
    background: 'rgba(136,22,28,0.08)',
    color: 'var(--color-brand-primary)',
    border: '1px solid rgba(136,22,28,0.15)',
} as const;

const neutralChipStyle = {
    background: 'rgba(74,74,74,0.08)',
    color: 'var(--color-brand-dark)',
    border: '1px solid rgba(74,74,74,0.12)',
} as const;

const warningChipStyle = {
    background: 'rgba(245,158,11,0.10)',
    color: '#92400e',
    border: '1px solid rgba(245,158,11,0.18)',
} as const;

const dangerChipStyle = {
    background: 'rgba(239,68,68,0.10)',
    color: '#b91c1c',
    border: '1px solid rgba(239,68,68,0.18)',
} as const;

const successChipStyle = {
    background: 'rgba(34,197,94,0.10)',
    color: '#166534',
    border: '1px solid rgba(34,197,94,0.18)',
} as const;

const glassPanelStyle = {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(136,22,28,0.10)',
} as const;


const getQualityChipStyle = (score?: number | null): CSSProperties => {
    if (score === undefined || score === null) return neutralChipStyle;
    if (score >= 70) return successChipStyle;
    if (score >= 50) return warningChipStyle;
    return dangerChipStyle;
};

const getQualityAccent = (score?: number | null) => {
    if (score === undefined || score === null) return '#6B7280';
    if (score >= 70) return '#166534';
    if (score >= 50) return '#92400e';
    return '#b91c1c';
};

const getQualityLabel = (score?: number | null) => {
    if (score === undefined || score === null) return 'Belum Ada Data';
    if (score >= 70) return 'Baik';
    if (score >= 50) return 'Perlu Perhatian';
    return 'Butuh Intervensi';
};

const getSenderTypeLabel = (type: string) => {
    switch (type) {
        case 'student':
            return 'Mahasiswa';
        case 'lecturer':
            return 'Dosen';
        case 'ai':
            return 'AI';
        case 'bot':
            return 'Bot';
        case 'system':
            return 'Sistem';
        default:
            return type;
    }
};

const getSenderTypeStyle = (type: string): CSSProperties => {
    switch (type) {
        case 'ai':
            return {
                background: 'rgba(180,83,9,0.10)',
                color: '#92400e',
                border: '1px solid rgba(180,83,9,0.18)',
            };
        case 'bot':
            return {
                background: 'rgba(71,85,105,0.10)',
                color: '#334155',
                border: '1px solid rgba(71,85,105,0.18)',
            };
        case 'system':
            return neutralChipStyle;
        case 'lecturer':
            return {
                background: 'rgba(245,158,11,0.10)',
                color: '#92400e',
                border: '1px solid rgba(245,158,11,0.16)',
            };
        default:
            return brandChipStyle;
    }
};

const engagementTypeInfo: Record<
    string,
    { description: string; chipStyle: CSSProperties; bar: string }
> = {
    cognitive: {
        description:
            ENGAGEMENT_TYPE_EXPLANATIONS.cognitive,
        chipStyle: {
            background: 'rgba(71,85,105,0.10)',
            color: '#334155',
            border: '1px solid rgba(71,85,105,0.18)',
        },
        bar: '#475569',
    },
    behavioral: {
        description: ENGAGEMENT_TYPE_EXPLANATIONS.behavioral,
        chipStyle: successChipStyle,
        bar: '#22c55e',
    },
    emotional: {
        description: ENGAGEMENT_TYPE_EXPLANATIONS.emotional,
        chipStyle: {
            background: 'rgba(180,83,9,0.10)',
            color: '#92400e',
            border: '1px solid rgba(180,83,9,0.18)',
        },
        bar: '#b45309',
    },
    social: {
        description: ENGAGEMENT_TYPE_EXPLANATIONS.social,
        chipStyle: {
            background: 'rgba(71,85,105,0.08)',
            color: '#334155',
            border: '1px solid rgba(71,85,105,0.14)',
        },
        bar: '#64748b',
    },
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function GroupAnalyticsDetail({ course, group, analytics, members, sessionDiscussions, recentActivity }: Props) {
    const [jwtToken, setJwtToken] = useState('');

    const safeAnalytics = useMemo(() => analytics ?? {}, [analytics]);
    const safeMembers = useMemo(() => members ?? [], [members]);
    const safeSessionDiscussions = useMemo(() => sessionDiscussions ?? [], [sessionDiscussions]);
    const safeRecentActivity = useMemo(() => recentActivity ?? [], [recentActivity]);
    const safeQualityBreakdown = useMemo(() => safeAnalytics.qualityBreakdown ?? {}, [safeAnalytics]);

    const [liveActivity, setLiveActivity] = useState<RecentActivity[]>(safeRecentActivity);
    const [liveQuality, setLiveQuality] = useState(safeAnalytics.qualityScore);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showRadarMetricHint, setShowRadarMetricHint] = useState(false);
    const radarMetricHintRef = useRef<HTMLDivElement>(null);


    const hotPercentage = safeQualityBreakdown.hot_percentage ?? safeAnalytics.hotPercentage ?? 0;
    const lexicalVariety = safeQualityBreakdown.lexical_variety ?? 0;
    const participantCount = safeQualityBreakdown.participation ?? safeMembers.length ?? 0;

    const radarMetrics = useMemo<number[] | null>(() => {
        const qualityScore = safeAnalytics.qualityScore ?? null;
        const cognitive = safeAnalytics.engagementDistribution?.cognitive ?? 0;
        const behavioral = safeAnalytics.engagementDistribution?.behavioral ?? 0;
        const social = safeAnalytics.engagementDistribution?.social ?? 0;
        const totalEngagement = cognitive + behavioral + social;
        const engagementSignal = totalEngagement > 0
            ? ((behavioral + social) / totalEngagement) * 10
            : 0;

        if (qualityScore === null && hotPercentage === 0 && totalEngagement === 0) {
            return null;
        }

        const hot = Math.min(10, hotPercentage / 10);
        const lexical = Math.min(10, lexicalVariety / 10);
        const performanceProxy = qualityScore !== null ? qualityScore / 10 : 0;
        const cognitiveSignal = totalEngagement > 0 ? (cognitive / totalEngagement) * 10 : 0;
        const collaboration = Math.min(10, engagementSignal);
        const reflectionProxy = qualityScore !== null
            ? Math.min(10, (qualityScore / 10) * 0.85)
            : 0;
        const forethoughtProxy = Math.min(10, cognitiveSignal);

        // Sumbu Forethought/Performance/Reflection memakai distribusi fase SRL
        // Zimmerman ASLI (klasifikasi ai-engine per pesan) bila tersedia;
        // kalau belum ada data, jatuh kembali ke proxy lama (engagement/quality).
        const srl = safeAnalytics.srl;
        const useSrl = !!srl && srl.total > 0;
        const srlShare = (n: number) => Math.min(10, (n / (srl!.total || 1)) * 10);
        const forethoughtAxis = useSrl ? srlShare(srl!.distribution.forethought) : forethoughtProxy;
        const performanceAxis = useSrl ? srlShare(srl!.distribution.performance) : performanceProxy;
        const reflectionAxis = useSrl ? srlShare(srl!.distribution.reflection) : reflectionProxy;

        return [
            Number(hot.toFixed(1)),
            Number(lexical.toFixed(1)),
            Number(forethoughtAxis.toFixed(1)),
            Number(performanceAxis.toFixed(1)),
            Number(collaboration.toFixed(1)),
            Number(reflectionAxis.toFixed(1)),
        ];
    }, [safeAnalytics, hotPercentage, lexicalVariety]);

    const navItems = useLecturerNav('analytics-group');

    useEffect(() => {
        getAuthToken().then(setJwtToken).catch((err) => {
            console.error(err);
            toast.error('Gagal mengambil token autentikasi. Silakan muat ulang halaman.');
        });
    }, []);

    useEffect(() => {
        setLiveActivity(safeRecentActivity);
    }, [safeRecentActivity]);

    useEffect(() => {
        setLiveQuality(safeAnalytics.qualityScore);
    }, [safeAnalytics.qualityScore]);

    useEffect(() => {
        if (!jwtToken) return;

        const apiUrl = resolveSocketUrl();
        const socket: Socket = io(apiUrl, {
            auth: { token: jwtToken },
            transports: ['polling'],
            upgrade: false,
        });

        socket.on('quality_update', (data) => {
            if (data.groupId === group.id) {
                setLiveQuality(data.qualityScore);
            }
        });


        socket.on('receive_message', (data: any) => {
            if (data.senderType === 'system' || data.isIntervention) return;
            const newItem: RecentActivity = {
                id: data.id || String(Date.now()),
                senderName: data.senderName || 'Unknown',
                senderType: data.senderType || 'student',
                content: (data.content || '').substring(0, 150),
                createdAt: data.createdAt || new Date().toISOString(),
                isIntervention: false,
            };
            setLiveActivity(prev => [newItem, ...prev].slice(0, 20));
        });

        return () => {
            socket.disconnect();
        };
    }, [jwtToken, group.id]);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (radarMetricHintRef.current && !radarMetricHintRef.current.contains(event.target as Node)) {
                setShowRadarMetricHint(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const qualityCards = [
        {
            label: 'HOT Thinking',
            value: `${hotPercentage.toFixed(0)}%`,
            detail: 'Proporsi pesan dengan penalaran tingkat tinggi.',
            color: '#334155',
        },
        {
            label: 'Lexical Variety',
            value: `${lexicalVariety.toFixed(0)}%`,
            detail: 'Keragaman kosakata dalam diskusi.',
            color: '#92400e',
        },
        {
            label: 'Participants',
            value: participantCount,
            detail: 'Jumlah anggota yang aktif berkontribusi.',
            color: '#166534',
        },
    ];

    const statCards = useMemo(
        () => [
            {
                label: 'Anggota',
                value: safeMembers.length || group.memberCount,
                detail:
                    safeMembers.length > 0
                        ? `${safeMembers.slice(0, 3).map((member) => member.name.split(' ')[0]).join(', ')}${
                              safeMembers.length > 3 ? '…' : ''
                          }`
                        : 'Belum ada anggota terdaftar',
                action: 'Klik untuk lihat semua anggota',
                color: '#88161c',
                onClick: () => setShowMemberModal(true),
            },
            {
                label: 'Sesi Diskusi',
                value: safeSessionDiscussions.length || group.sessionDiscussionCount,
                detail: safeSessionDiscussions[0]?.name || 'Belum ada sesi aktif',
                action: 'Klik untuk lihat seluruh sesi diskusi',
                color: '#4A4A4A',
                onClick: () => setShowSessionModal(true),
            },
            {
                label: 'Total Pesan',
                value: safeAnalytics.local_message_count ?? 0,
                detail: 'Pesan yang dianalisis pada grup ini',
                color: '#334155',
            },
            {
                label: 'Status',
                value: getQualityLabel(liveQuality),
                detail: 'Status kualitas diskusi saat ini',
                color: getQualityAccent(liveQuality),
            },
        ],
        [group.sessionDiscussionCount, group.memberCount, liveQuality, safeAnalytics.local_message_count, safeSessionDiscussions, safeMembers],
    );

    const engagementEntries = Object.entries(safeAnalytics.engagementDistribution ?? {});
    const engagementTotal = engagementEntries.reduce((sum, [, count]) => sum + count, 0);

    return (
        <AppLayout title={`Analitik ${group.name}`} navItems={navItems}>
            <Head title={`Detail Analitik - ${group.name}`} />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={320} />
                <OrganicBlob className="top-40 -right-12" delay={-4} color="rgba(136, 22, 28, 0.03)" size={250} />

                <div className="relative space-y-8">
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <LiquidGlassCard intensity="medium" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6 sm:p-8" lightMode={true}>
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="max-w-3xl space-y-4">
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-brand-muted-dark">
                                        <Link href={lecturer.courses.index.url()} className="transition-colors hover:text-brand-primary">
                                            Kelas
                                        </Link>
                                        <span>/</span>
                                        <Link
                                            href={lecturer.courses.show.url({ course: course.id })}
                                            className="transition-colors hover:text-brand-primary"
                                        >
                                            {course.code}
                                        </Link>
                                        <span>/</span>
                                        <Link
                                            href={lecturer.analytics.index.url({ course: course.id })}
                                            className="transition-colors hover:text-brand-primary"
                                        >
                                            Analitik
                                        </Link>
                                        <span>/</span>
                                        <span style={headingStyle}>{group.name}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={badgeClass} style={brandChipStyle}>
                                            {course.code}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={headingStyle}>
                                            Detail analitik diskusi {group.name}
                                        </h1>
                                        <p className={`max-w-2xl ${bodyTextClass}`}>
                                            Ringkasan kualitas diskusi, distribusi engagement SSRL, radar metrik, dan aktivitas percakapan terbaru dalam satu tampilan yang konsisten.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-start gap-3 xl:items-end">
                                    <Link
                                        href={lecturer.analytics.detail.url({ course: course.id })}
                                        className="inline-flex items-center rounded-full border border-brand-primary/15 bg-white px-4 py-2 text-sm font-medium text-brand-primary shadow-sm transition-colors hover:bg-brand-primary/5"
                                    >
                                        Kembali ke analitik kelas
                                    </Link>

                                    <div className="w-full rounded-2xl border border-brand-primary/10 bg-white/90 p-5 xl:w-[260px]" style={glassPanelStyle}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted-dark">Skor kualitas</p>
                                        <div className="mt-3 flex items-end gap-2">
                                            <span className="text-5xl font-semibold leading-none" style={{ color: getQualityAccent(liveQuality) }}>
                                                {liveQuality?.toFixed(1) ?? '—'}
                                            </span>
                                            <span className="pb-1 text-sm text-brand-muted-dark">/100</span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className={badgeClass} style={getQualityChipStyle(liveQuality)}>
                                                {getQualityLabel(liveQuality)}
                                            </span>
                                            <span className={badgeClass} style={neutralChipStyle}>
                                                {safeAnalytics.local_message_count ?? 0} pesan
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.section>

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {statCards.map((card, index) => {
                            const content = (
                                <LiquidGlassCard intensity="light" className="h-full rounded-2xl border border-brand-primary/10 bg-white/95 p-6" lightMode={true}>
                                    <div className="flex h-full flex-col justify-between gap-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-brand-muted-dark">{card.label}</p>
                                                <p className="text-3xl font-semibold tracking-tight break-words" style={headingStyle}>
                                                    {card.value}
                                                </p>
                                            </div>
                                            <div
                                                className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                                                style={{ background: `${card.color}12`, borderColor: `${card.color}20` }}
                                            >
                                                {card.label === 'Anggota' ? (
                                                    <Users className="h-5 w-5" style={{ color: card.color }} />
                                                ) : card.label === 'Sesi Diskusi' ? (
                                                    <MessageSquare className="h-5 w-5" style={{ color: card.color }} />
                                                ) : card.label === 'Total Pesan' ? (
                                                    <BarChart3 className="h-5 w-5" style={{ color: card.color }} />
                                                ) : (
                                                    <Activity className="h-5 w-5" style={{ color: card.color }} />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm text-brand-muted-dark">{card.detail}</p>
                                            {card.action && <p className="text-xs font-medium text-brand-primary">{card.action}</p>}
                                        </div>
                                    </div>
                                </LiquidGlassCard>
                            );

                            return (
                                <motion.div
                                    key={card.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.08 * (index + 1) }}
                                >
                                    {card.onClick ? (
                                        <button type="button" onClick={card.onClick} className="block h-full w-full text-left">
                                            {content}
                                        </button>
                                    ) : (
                                        content
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                    >
                        <LiquidGlassCard intensity="light" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6" lightMode={true}>
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="max-w-xl space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-primary/10 bg-brand-primary/5">
                                            <Lightbulb className="h-5 w-5 text-brand-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold" style={headingStyle}>
                                                Ringkasan kualitas diskusi
                                            </h2>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                Ringkasan cepat kualitas diskusi grup.
                                            </p>
                                        </div>
                                    </div>

                                    {safeAnalytics.recommendation && (
                                        <div className="rounded-2xl border border-brand-primary/10 bg-brand-primary/[0.03] p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">Rekomendasi</p>
                                            <p className="mt-2 text-sm leading-6 text-brand-muted-dark">{safeAnalytics.recommendation}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-1 xl:w-[56%]">
                                    {qualityCards.map((card) => (
                                        <div
                                            key={card.label}
                                            className="rounded-2xl border p-5"
                                            style={{ background: `${card.color}08`, borderColor: `${card.color}16` }}
                                        >
                                            <div className="flex flex-wrap items-end justify-between gap-3">
                                                <p className="text-3xl font-semibold tracking-tight" style={{ color: card.color }}>
                                                    {card.value}
                                                </p>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted-dark">
                                                    {card.label}
                                                </p>
                                            </div>
                                            <p className="mt-3 text-sm leading-6 text-brand-muted-dark">{card.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.section>

                    {engagementEntries.length > 0 && (
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.22 }}
                        >
                            <LiquidGlassCard intensity="light" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6" lightMode={true}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-500/10 bg-slate-500/5">
                                            <BarChart3 className="h-5 w-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold" style={headingStyle}>
                                                Distribusi engagement SSRL
                                            </h2>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                Ringkasan jenis keterlibatan yang paling dominan dalam percakapan.
                                            </p>
                                        </div>
                                    </div>

                                    <span className={badgeClass} style={neutralChipStyle}>
                                        {engagementTotal} sinyal terklasifikasi
                                    </span>
                                </div>

                                <div className="mt-6 space-y-3">
                                    {engagementEntries.map(([type, count]) => {
                                        const key = type.toLowerCase();
                                        const info = engagementTypeInfo[key] || engagementTypeInfo.behavioral;
                                        const percentage = engagementTotal > 0 ? Math.round((count / engagementTotal) * 100) : 0;

                                        return (
                                            <div key={type} className="rounded-2xl border bg-white/90 p-4" style={glassPanelStyle}>
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                                                    <div className="lg:w-[42%] lg:shrink-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold capitalize" style={{ color: info.chipStyle.color as string }}>
                                                                {type}
                                                            </p>
                                                            <span className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium" style={info.chipStyle}>
                                                                {count} sinyal
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6 text-brand-muted-dark">{info.description}</p>
                                                    </div>

                                                    <div className="flex flex-1 items-center gap-3">
                                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${percentage}%`, background: info.bar }}
                                                            />
                                                        </div>
                                                        <span className="w-10 text-right text-sm font-semibold tabular-nums" style={{ color: info.chipStyle.color as string }}>
                                                            {percentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </LiquidGlassCard>
                        </motion.section>
                    )}

                    {radarMetrics && (
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <LiquidGlassCard intensity="light" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6" lightMode={true}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-primary/10 bg-brand-primary/5">
                                            <BarChart3 className="h-5 w-5 text-brand-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold" style={headingStyle}>
                                                Radar metrik SSRL
                                            </h2>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                Profil singkat enam dimensi kualitas diskusi grup.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative" ref={radarMetricHintRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowRadarMetricHint((current) => !current)}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
                                            style={{
                                                background: showRadarMetricHint ? 'rgba(136,22,28,0.10)' : 'rgba(255,255,255,0.92)',
                                                color: showRadarMetricHint ? 'var(--color-brand-primary)' : '#6B7280',
                                                borderColor: showRadarMetricHint ? 'rgba(136,22,28,0.22)' : 'rgba(0,0,0,0.08)',
                                            }}
                                            aria-label="Tampilkan penjelasan metrik radar"
                                            title="Penjelasan metrik radar"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                        {showRadarMetricHint ? (
                                            <div
                                                className="absolute right-full top-1/2 z-20 mr-3 w-[min(28rem,calc(100vw-4rem))] -translate-y-1/2 rounded-2xl border border-brand-primary/10 bg-white/96 p-4 shadow-2xl"
                                                style={{ backdropFilter: 'blur(16px)' }}
                                            >
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {RADAR_METRIC_LABELS.map((label) => (
                                                        <div key={`${label}-radar-explanation`}>
                                                            <p className="text-xs font-semibold text-brand-dark">{label}</p>
                                                            <p className="mt-1 text-xs leading-5 text-brand-muted-dark">{RADAR_METRIC_DEFINITIONS[label]}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <div className="rounded-2xl border border-brand-primary/10 bg-white/90 p-4">
                                        <div className="h-[360px] w-full">
                                            <MetricsRadarChart
                                                data={radarMetrics}
                                                labels={RADAR_METRIC_LABELS}
                                                primaryLabel={group.name}
                                            />
                                            {safeAnalytics.srl && safeAnalytics.srl.total > 0 && (
                                                <p className="mt-1 text-center text-xs text-brand-muted-dark">
                                                    Fase SRL Zimmerman dari {safeAnalytics.srl.total} pesan — Forethought{' '}
                                                    {safeAnalytics.srl.distribution.forethought} · Performance{' '}
                                                    {safeAnalytics.srl.distribution.performance} · Reflection{' '}
                                                    {safeAnalytics.srl.distribution.reflection}
                                                    {safeAnalytics.srl.avgConfidence != null &&
                                                        ` · keyakinan rata-rata ${Math.round(safeAnalytics.srl.avgConfidence * 100)}%`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-brand-primary/10 bg-white/90 p-2 sm:p-4">
                                        <MetricBreakdownTable
                                            metrics={radarMetrics}
                                            labels={RADAR_METRIC_LABELS}
                                            classAverage={radarMetrics}
                                            primaryLabel={group.name}
                                            showDelta={false}
                                        />
                                    </div>
                                </div>
                            </LiquidGlassCard>
                        </motion.section>
                    )}

                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <LiquidGlassCard intensity="light" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6" lightMode={true}>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-primary/10 bg-brand-primary/5">
                                        <Clock3 className="h-5 w-5 text-brand-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold" style={headingStyle}>
                                            Aktivitas terbaru
                                        </h2>
                                        <p className={`mt-1 ${bodyTextClass}`}>
                                            Riwayat pesan terbaru grup, termasuk intervensi dan sinyal bantuan AI.
                                        </p>
                                    </div>
                                </div>

                                <span className={badgeClass} style={neutralChipStyle}>
                                    {liveActivity.length} aktivitas
                                </span>
                            </div>

                            <div className="mt-6 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                {liveActivity.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-brand-primary/15 bg-white/80 px-6 py-14 text-center">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-primary/10 bg-brand-primary/5">
                                            <MessageSquare className="h-6 w-6 text-brand-primary" />
                                        </div>
                                        <p className="mt-4 text-base font-semibold" style={headingStyle}>
                                            Belum ada aktivitas diskusi
                                        </p>
                                        <p className={`mx-auto mt-2 max-w-md ${bodyTextClass}`}>
                                            Aktivitas terbaru akan muncul di sini saat anggota grup mulai berinteraksi.
                                        </p>
                                    </div>
                                ) : (
                                    liveActivity.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="rounded-2xl border p-4"
                                            style={
                                                activity.isIntervention
                                                    ? {
                                                          background: 'rgba(180,83,9,0.06)',
                                                          border: '1px solid rgba(180,83,9,0.18)',
                                                      }
                                                    : glassPanelStyle
                                            }
                                        >
                                            <div className="flex gap-3">
                                                <span
                                                    className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                                                    style={getSenderTypeStyle(activity.senderType)}
                                                >
                                                    {activity.senderName.charAt(0).toUpperCase()}
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-semibold" style={headingStyle}>
                                                            {activity.senderName}
                                                        </span>
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium" style={getSenderTypeStyle(activity.senderType)}>
                                                            {getSenderTypeLabel(activity.senderType)}
                                                        </span>
                                                        {activity.isIntervention && (
                                                            <span
                                                                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium"
                                                                style={{
                                                                    background: 'rgba(180,83,9,0.10)',
                                                                    color: '#92400e',
                                                                    border: '1px solid rgba(180,83,9,0.18)',
                                                                }}
                                                                title={activity.interventionReason || activity.guardrailReason || undefined}
                                                            >
                                                                {activity.interventionType === 'scaffolding' ? 'Scaffolding' : activity.interventionType === 'redirection' ? 'Diarahkan' : activity.interventionType || 'Intervensi'}
                                                            </span>
                                                        )}
                                                        {activity.scaffoldingLevel && (
                                                            <span
                                                                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium"
                                                                style={{
                                                                    background: 'rgba(37,99,235,0.08)',
                                                                    color: '#1e40af',
                                                                    border: '1px solid rgba(37,99,235,0.15)',
                                                                }}
                                                                title={`Level scaffolding: ${activity.scaffoldingLevel}`}
                                                            >
                                                                AI membantu
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="mt-2 text-sm leading-6 text-brand-muted-dark">{activity.content}</p>
                                                    <p className="mt-2 text-xs text-gray-500">{formatDateTime(activity.createdAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </LiquidGlassCard>
                    </motion.section>
                </div>
            </div>

            <BaseModal open={showMemberModal} title={`Daftar Anggota (${safeMembers.length})`} onClose={() => setShowMemberModal(false)} size="md" className="rounded-2xl border border-brand-primary/10 bg-white p-6 shadow-2xl">
                <div>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-[#1F2937]" style={headingStyle}>
                                Daftar Anggota ({safeMembers.length})
                            </h3>
                            <p className="mt-1 text-sm text-brand-muted-dark">Seluruh anggota grup dapat ditinjau dari modal ini.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowMemberModal(false)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-muted-dark transition-colors hover:bg-gray-100 hover:text-[#374151]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-5 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                        {safeMembers.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center">
                                <p className="text-sm text-brand-muted-dark">Belum ada anggota</p>
                            </div>
                        ) : (
                            safeMembers.map((member) => (
                                <div key={member.id} className="flex items-center gap-3 rounded-xl border border-brand-primary/10 bg-brand-primary/[0.03] px-4 py-3">
                                    <span
                                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                                        style={brandChipStyle}
                                    >
                                        {member.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-[#1F2937]">{member.name}</p>
                                        <p className="mt-0.5 truncate text-xs text-brand-muted-dark">{member.email}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </BaseModal>

            <BaseModal open={showSessionModal} title={`Sesi Diskusi (${safeSessionDiscussions.length})`} onClose={() => setShowSessionModal(false)} size="md" className="rounded-2xl border border-brand-primary/10 bg-white p-6 shadow-2xl">
                <div>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-[#1F2937]" style={headingStyle}>
                                Sesi Diskusi ({safeSessionDiscussions.length})
                            </h3>
                            <p className="mt-1 text-sm text-brand-muted-dark">Status sesi, waktu dibuat, dan waktu selesai.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowSessionModal(false)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-muted-dark transition-colors hover:bg-gray-100 hover:text-[#374151]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-5 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                        {safeSessionDiscussions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center">
                                <p className="text-sm text-brand-muted-dark">Belum ada sesi diskusi</p>
                            </div>
                        ) : (
                            safeSessionDiscussions.map((session) => (
                                <div key={session.id} className="flex items-start justify-between gap-3 rounded-xl border border-brand-primary/10 bg-brand-primary/[0.03] px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[#1F2937]">{session.name || 'Sesi Tanpa Judul'}</p>
                                        <p className="mt-1 text-xs text-brand-muted-dark">Dibuat: {formatDateTime(session.createdAt)}</p>
                                        {session.closedAt && (
                                            <p className="mt-0.5 text-xs text-brand-muted-dark">Selesai: {formatDateTime(session.closedAt)}</p>
                                        )}
                                    </div>
                                    <span className={badgeClass} style={session.isClosed ? neutralChipStyle : successChipStyle}>
                                        {session.isClosed ? 'Selesai' : 'Aktif'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </BaseModal>
        </AppLayout>
    );
}
