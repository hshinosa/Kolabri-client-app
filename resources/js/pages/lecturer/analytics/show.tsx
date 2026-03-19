import { Head, Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    BarChart3,
    Clock3,
    Download,
    MessageSquare,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { LiquidGlassCard, OrganicBlob, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course, SharedData } from '@/types';

interface Member {
    id: string;
    name: string;
    email: string;
}

interface ChatSpace {
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

interface GroupAnalyticsData {
    qualityScore?: number;
    recommendation?: string;
    engagementDistribution?: Record<string, number>;
    qualityBreakdown?: QualityBreakdown;
    hotPercentage?: number;
    local_message_count?: number;
}

interface RecentActivity {
    id: string;
    senderName: string;
    senderType: string;
    content: string;
    createdAt: string;
    isIntervention: boolean;
}

interface Props {
    course: Course;
    group: {
        id: string;
        name: string;
        memberCount: number;
        chatSpaceCount: number;
    };
    analytics: GroupAnalyticsData;
    members: Member[];
    chatSpaces: ChatSpace[];
    recentActivity: RecentActivity[];
}

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const bodyTextClass = 'text-sm text-[#6B7280]';

const brandChipStyle = {
    background: 'rgba(136,22,28,0.08)',
    color: '#88161c',
    border: '1px solid rgba(136,22,28,0.15)',
} as const;

const neutralChipStyle = {
    background: 'rgba(74,74,74,0.08)',
    color: '#4A4A4A',
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
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.65)',
} as const;

const modalBackdropClass = 'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm';

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
                background: 'rgba(168,85,247,0.10)',
                color: '#7e22ce',
                border: '1px solid rgba(168,85,247,0.16)',
            };
        case 'bot':
            return {
                background: 'rgba(59,130,246,0.10)',
                color: '#1d4ed8',
                border: '1px solid rgba(59,130,246,0.16)',
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
    { description: string; examples: string[]; chipStyle: CSSProperties; bar: string; icon: string }
> = {
    cognitive: {
        description: 'Pemikiran kritis, analisis, dan pemahaman konsep.',
        examples: ['mengapa', 'bagaimana jika', 'bandingkan', 'analisis'],
        chipStyle: {
            background: 'rgba(59,130,246,0.10)',
            color: '#1d4ed8',
            border: '1px solid rgba(59,130,246,0.16)',
        },
        bar: '#3b82f6',
        icon: '🧠',
    },
    behavioral: {
        description: 'Partisipasi aktif, koordinasi tugas, dan tindakan nyata.',
        examples: ['saya akan', 'mari kita', 'sudah selesai', 'bisa bantu'],
        chipStyle: successChipStyle,
        bar: '#22c55e',
        icon: '⚡',
    },
    emotional: {
        description: 'Dukungan emosional, motivasi, dan empati antaranggota.',
        examples: ['bagus', 'semangat', 'terima kasih', 'jangan khawatir'],
        chipStyle: {
            background: 'rgba(168,85,247,0.10)',
            color: '#7e22ce',
            border: '1px solid rgba(168,85,247,0.16)',
        },
        bar: '#a855f7',
        icon: '💜',
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

export default function GroupAnalyticsDetail({ course, group, analytics, members, chatSpaces, recentActivity }: Props) {
    const { auth } = usePage<SharedData>().props;

    const safeAnalytics = analytics ?? {};
    const safeMembers = members ?? [];
    const safeChatSpaces = chatSpaces ?? [];
    const safeRecentActivity = recentActivity ?? [];
    const safeQualityBreakdown = safeAnalytics.qualityBreakdown ?? {};

    const [liveActivity, setLiveActivity] = useState<RecentActivity[]>(safeRecentActivity);
    const [liveQuality, setLiveQuality] = useState(safeAnalytics.qualityScore);
    const [isConnected, setIsConnected] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);

    const hotPercentage = safeQualityBreakdown.hot_percentage ?? safeAnalytics.hotPercentage ?? 0;
    const lexicalVariety = safeQualityBreakdown.lexical_variety ?? 0;
    const participantCount = safeQualityBreakdown.participation ?? safeMembers.length ?? 0;

    const navItems = useLecturerNav('analytics-group', { courseId: course.id, groupId: group.id });

    useEffect(() => {
        setLiveActivity(safeRecentActivity);
    }, [safeRecentActivity]);

    useEffect(() => {
        setLiveQuality(safeAnalytics.qualityScore);
    }, [safeAnalytics.qualityScore]);

    useEffect(() => {
        if (!auth.token) return;

        const apiUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const socket: Socket = io(apiUrl, {
            auth: { token: auth.token },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('quality_update', (data) => {
            if (data.groupId === group.id) {
                setLiveQuality(data.qualityScore);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [auth.token, group.id]);

    const qualityCards = [
        {
            label: 'HOT Thinking',
            value: `${hotPercentage.toFixed(0)}%`,
            detail: 'Higher-order discussion',
            color: '#1d4ed8',
        },
        {
            label: 'Lexical Variety',
            value: `${(lexicalVariety * 100).toFixed(0)}%`,
            detail: 'Keragaman kosakata',
            color: '#7e22ce',
        },
        {
            label: 'Participants',
            value: participantCount,
            detail: 'Peserta aktif yang terdeteksi',
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
                value: safeChatSpaces.length || group.chatSpaceCount,
                detail: safeChatSpaces[0]?.name || 'Belum ada sesi aktif',
                action: 'Klik untuk lihat seluruh sesi diskusi',
                color: '#4A4A4A',
                onClick: () => setShowSessionModal(true),
            },
            {
                label: 'Total Pesan',
                value: safeAnalytics.local_message_count ?? 0,
                detail: 'Pesan yang dianalisis pada grup ini',
                color: '#1d4ed8',
            },
            {
                label: 'Status',
                value: getQualityLabel(liveQuality),
                detail: isConnected ? 'Sinkron dengan pembaruan live' : 'Menunggu sinyal pembaruan live',
                color: getQualityAccent(liveQuality),
            },
        ],
        [group.chatSpaceCount, group.memberCount, isConnected, liveQuality, safeAnalytics.local_message_count, safeChatSpaces, safeMembers],
    );

    const engagementEntries = Object.entries(safeAnalytics.engagementDistribution ?? {});
    const engagementTotal = engagementEntries.reduce((sum, [, count]) => sum + count, 0);

    return (
        <AppLayout title={`${group.name} Analytics`} navItems={navItems}>
            <Head title={`${group.name} Analytics`} />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={320} />
                <OrganicBlob className="top-40 -right-12" delay={-4} color="rgba(136, 22, 28, 0.03)" size={250} />

                <div className="relative space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <LiquidGlassCard intensity="medium" className="p-6 sm:p-8" lightMode={true}>
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-[#6B7280]">
                                        <Link href={lecturer.courses.index.url()} className="transition-colors hover:text-[#88161c]">
                                            Kelas
                                        </Link>
                                        <span>/</span>
                                        <Link
                                            href={lecturer.courses.show.url({ course: course.id })}
                                            className="transition-colors hover:text-[#88161c]"
                                        >
                                            {course.code}
                                        </Link>
                                        <span>/</span>
                                        <Link
                                            href={lecturer.analytics.index.url({ course: course.id })}
                                            className="transition-colors hover:text-[#88161c]"
                                        >
                                            Analytics
                                        </Link>
                                        <span>/</span>
                                        <span style={headingStyle}>{group.name}</span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full px-3 py-1 text-xs font-medium" style={brandChipStyle}>
                                            {course.code}
                                        </span>
                                        <span className="rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                            {group.memberCount} anggota • {group.chatSpaceCount} sesi
                                        </span>
                                        <span
                                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                                            style={isConnected ? successChipStyle : neutralChipStyle}
                                        >
                                            <Activity className="h-3.5 w-3.5" />
                                            {isConnected ? 'Live quality aktif' : 'Menunggu koneksi live'}
                                        </span>
                                    </div>

                                    <h1 className="mt-4 text-2xl font-bold sm:text-3xl" style={headingStyle}>
                                        Detail kualitas diskusi {group.name}
                                    </h1>
                                    <p className={`mt-2 max-w-2xl ${bodyTextClass}`}>
                                        Seluruh metrik kualitas, distribusi engagement, aktivitas terbaru, modal anggota, modal sesi,
                                        dan tautan export tetap utuh dengan bahasa visual liquid-glass yang konsisten.
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:w-[380px] xl:grid-cols-1">
                                    <div className="rounded-[28px] p-4" style={glassPanelStyle}>
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Skor terkini</p>
                                        <div className="mt-2 flex items-end gap-2">
                                            <span className="text-4xl font-semibold" style={{ ...headingStyle, color: getQualityAccent(liveQuality) }}>
                                                {liveQuality?.toFixed(1) ?? '—'}
                                            </span>
                                            <span className="pb-1 text-sm text-[#9CA3AF]">/ 100</span>
                                        </div>
                                        <p className="mt-2 text-xs text-[#6B7280]">Status: {getQualityLabel(liveQuality)}</p>
                                    </div>

                                    <SecondaryButton href={`/api/analytics/export/${course.id}`} className="justify-center">
                                        <Download className="h-4 w-4" />
                                        Export process mining
                                    </SecondaryButton>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                    >
                        <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                                <div className="max-w-xl">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full px-3 py-1 text-xs font-medium" style={getQualityChipStyle(liveQuality)}>
                                            {getQualityLabel(liveQuality)}
                                        </span>
                                        <span className="rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                            {safeAnalytics.local_message_count ?? 0} pesan dianalisis
                                        </span>
                                    </div>
                                    <p className="mt-4 text-sm font-medium text-[#6B7280]">Skor kualitas diskusi</p>
                                    <div className="mt-2 flex items-end gap-3">
                                        <span className="text-6xl font-semibold" style={{ ...headingStyle, color: getQualityAccent(liveQuality) }}>
                                            {liveQuality?.toFixed(1) ?? '—'}
                                        </span>
                                        <span className="pb-2 text-lg text-[#9CA3AF]">/100</span>
                                    </div>
                                    {safeAnalytics.recommendation && (
                                        <div className="mt-4 rounded-[24px] p-4" style={glassPanelStyle}>
                                            <div className="flex items-start gap-3">
                                                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: '#88161c' }} />
                                                <p className="text-sm leading-6 text-[#6B7280]">{safeAnalytics.recommendation}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3 xl:w-[52%]">
                                    {qualityCards.map((card) => (
                                        <div
                                            key={card.label}
                                            className="rounded-[24px] p-4 text-center"
                                            style={{
                                                background: `${card.color}10`,
                                                border: `1px solid ${card.color}18`,
                                            }}
                                        >
                                            <p className="text-2xl font-semibold" style={{ color: card.color }}>
                                                {card.value}
                                            </p>
                                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                                                {card.label}
                                            </p>
                                            <p className="mt-1 text-xs text-[#6B7280]">{card.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {statCards.map((card, index) => {
                            const content = (
                                <LiquidGlassCard intensity="light" className="h-full p-5" lightMode={true}>
                                    <div className="flex h-full flex-col justify-between gap-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-[#6B7280]">{card.label}</p>
                                                <p className="mt-2 text-3xl font-light break-words" style={headingStyle}>
                                                    {card.value}
                                                </p>
                                            </div>
                                            <div
                                                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                                style={{
                                                    background: `${card.color}12`,
                                                    border: `1px solid ${card.color}20`,
                                                }}
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

                                        <div>
                                            <p className="text-xs text-[#6B7280]">{card.detail}</p>
                                            {card.action && (
                                                <p className="mt-3 text-xs font-medium" style={{ color: '#88161c' }}>
                                                    {card.action}
                                                </p>
                                            )}
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

                    {engagementEntries.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.22 }}
                        >
                            <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                                style={{
                                                    background: 'rgba(59,130,246,0.10)',
                                                    border: '1px solid rgba(59,130,246,0.16)',
                                                }}
                                            >
                                                <BarChart3 className="h-5 w-5" style={{ color: '#1d4ed8' }} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold" style={headingStyle}>
                                                    Distribusi engagement (SSRL)
                                                </h2>
                                                <p className={`mt-1 ${bodyTextClass}`}>
                                                    Klasifikasi percakapan berdasarkan jenis keterlibatan dalam pembelajaran kolaboratif.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <span className="rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                        {engagementTotal} sinyal terklasifikasi
                                    </span>
                                </div>

                                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                                    {engagementEntries.map(([type, count]) => {
                                        const key = type.toLowerCase();
                                        const info = engagementTypeInfo[key] || engagementTypeInfo.behavioral;
                                        const percentage = engagementTotal > 0 ? (count / engagementTotal) * 100 : 0;

                                        return (
                                            <div key={type} className="rounded-[28px] p-5" style={glassPanelStyle}>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{info.icon}</span>
                                                    <span
                                                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize"
                                                        style={info.chipStyle}
                                                    >
                                                        {type}
                                                    </span>
                                                </div>

                                                <div className="mt-4 flex items-end justify-between gap-3">
                                                    <p className="text-4xl font-semibold" style={{ ...headingStyle, color: info.chipStyle.color as string }}>
                                                        {count}
                                                    </p>
                                                    <p className="text-sm font-medium" style={{ color: info.chipStyle.color as string }}>
                                                        {percentage.toFixed(0)}%
                                                    </p>
                                                </div>

                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%`, background: info.bar }}
                                                    />
                                                </div>

                                                <p className="mt-3 text-sm leading-6 text-[#6B7280]">{info.description}</p>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {info.examples.map((example) => (
                                                        <span
                                                            key={example}
                                                            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                                                            style={info.chipStyle}
                                                        >
                                                            “{example}”
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                            style={{
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.12)',
                                            }}
                                        >
                                            <Clock3 className="h-5 w-5" style={{ color: '#88161c' }} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold" style={headingStyle}>
                                                Aktivitas terbaru
                                            </h2>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                Riwayat pesan terbaru grup, termasuk intervensi, tetap tampil dalam urutan dan konteks yang sama.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <span className="rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                    {liveActivity.length} aktivitas
                                </span>
                            </div>

                            <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                {liveActivity.length === 0 ? (
                                    <div className="rounded-[28px] px-6 py-14 text-center" style={glassPanelStyle}>
                                        <div
                                            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                                            style={{
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.12)',
                                            }}
                                        >
                                            <MessageSquare className="h-6 w-6" style={{ color: '#88161c' }} />
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
                                            className="rounded-[24px] p-4"
                                            style={
                                                activity.isIntervention
                                                    ? {
                                                          background: 'rgba(168,85,247,0.10)',
                                                          border: '1px solid rgba(168,85,247,0.16)',
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
                                                        <span
                                                            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                                                            style={getSenderTypeStyle(activity.senderType)}
                                                        >
                                                            {getSenderTypeLabel(activity.senderType)}
                                                        </span>
                                                        {activity.isIntervention && (
                                                            <span
                                                                className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                                                                style={{
                                                                    background: 'rgba(168,85,247,0.10)',
                                                                    color: '#7e22ce',
                                                                    border: '1px solid rgba(168,85,247,0.16)',
                                                                }}
                                                            >
                                                                Intervensi
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">{activity.content}</p>
                                                    <p className="mt-2 text-xs text-[#9CA3AF]">{formatDateTime(activity.createdAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {showMemberModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={modalBackdropClass}
                            onClick={() => setShowMemberModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-md p-6" lightMode={true}>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold" style={headingStyle}>
                                            Daftar anggota ({safeMembers.length})
                                        </h3>
                                        <p className={`mt-1 ${bodyTextClass}`}>
                                            Seluruh anggota grup tetap dapat ditinjau dari modal yang sama.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowMemberModal(false)}
                                        className="rounded-full p-2 transition-colors"
                                        style={glassPanelStyle}
                                    >
                                        <X className="h-4 w-4" style={{ color: '#4A4A4A' }} />
                                    </button>
                                </div>

                                <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                                    {safeMembers.length === 0 ? (
                                        <div className="rounded-[24px] px-6 py-10 text-center" style={glassPanelStyle}>
                                            <p className="text-sm text-[#6B7280]">Belum ada anggota</p>
                                        </div>
                                    ) : (
                                        safeMembers.map((member) => (
                                            <div key={member.id} className="flex items-center gap-3 rounded-[24px] p-4" style={glassPanelStyle}>
                                                <span
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                                                    style={brandChipStyle}
                                                >
                                                    {member.name.charAt(0).toUpperCase()}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold" style={headingStyle}>
                                                        {member.name}
                                                    </p>
                                                    <p className="mt-1 truncate text-xs text-[#6B7280]">{member.email}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSessionModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={modalBackdropClass}
                            onClick={() => setShowSessionModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-md p-6" lightMode={true}>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold" style={headingStyle}>
                                            Sesi diskusi ({safeChatSpaces.length})
                                        </h3>
                                        <p className={`mt-1 ${bodyTextClass}`}>
                                            Seluruh status sesi, waktu dibuat, dan waktu selesai tetap tersedia di modal ini.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSessionModal(false)}
                                        className="rounded-full p-2 transition-colors"
                                        style={glassPanelStyle}
                                    >
                                        <X className="h-4 w-4" style={{ color: '#4A4A4A' }} />
                                    </button>
                                </div>

                                <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                                    {safeChatSpaces.length === 0 ? (
                                        <div className="rounded-[24px] px-6 py-10 text-center" style={glassPanelStyle}>
                                            <p className="text-sm text-[#6B7280]">Belum ada sesi diskusi</p>
                                        </div>
                                    ) : (
                                        safeChatSpaces.map((session) => (
                                            <div key={session.id} className="rounded-[24px] p-4" style={glassPanelStyle}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold" style={headingStyle}>
                                                            {session.name || 'Sesi Tanpa Judul'}
                                                        </p>
                                                        <p className="mt-2 text-xs text-[#6B7280]">
                                                            Dibuat: {formatDateTime(session.createdAt)}
                                                        </p>
                                                        {session.closedAt && (
                                                            <p className="mt-1 text-xs text-[#6B7280]">
                                                                Selesai: {formatDateTime(session.closedAt)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span
                                                        className="rounded-full px-3 py-1 text-xs font-medium"
                                                        style={session.isClosed ? neutralChipStyle : successChipStyle}
                                                    >
                                                        {session.isClosed ? 'Selesai' : 'Aktif'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
