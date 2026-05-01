import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BarChart3,
    MessageSquare,
    RefreshCw,
    Sparkles,
    Users,
} from 'lucide-react';
import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { LiquidGlassCard, OrganicBlob, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course } from '@/types';
import { getAuthToken } from '@/lib/getAuthToken';

interface GroupAnalytics {
    groupId: string;
    groupName: string;
    memberCount: number;
    chatSpaceCount: number;
    messageCount: number;
    qualityScore?: number;
    recommendation?: string;
    engagementDistribution?: Record<string, number>;
    needsAttention: boolean;
}

interface CourseAnalyticsSummary {
    totalGroups: number;
    totalMessages: number;
    averageQualityScore: number | null;
    groupsNeedingAttention: number;
}

interface Props {
    course: Course;
    analytics: {
        summary: CourseAnalyticsSummary;
        groups: GroupAnalytics[];
    };
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

const tableHeaderStyle = {
    background: 'rgba(255,255,255,0.58)',
    borderBottom: '1px solid rgba(255,255,255,0.72)',
} as const;

const defaultSummary: CourseAnalyticsSummary = {
    totalGroups: 0,
    totalMessages: 0,
    averageQualityScore: null,
    groupsNeedingAttention: 0,
};

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

const getStatusLabel = (score?: number | null) => {
    if (score === undefined || score === null) return 'Belum Ada Data';
    if (score >= 70) return 'Baik';
    if (score >= 50) return 'Perlu Perhatian';
    return 'Butuh Intervensi';
};

const getEngagementStyle = (type: string) => {
    const key = type.toLowerCase();

    if (key.includes('cognitive')) {
        return {
            chip: {
                background: 'rgba(59,130,246,0.10)',
                color: '#1d4ed8',
                border: '1px solid rgba(59,130,246,0.16)',
            } satisfies CSSProperties,
            bar: '#3b82f6',
        };
    }

    if (key.includes('behavioral')) {
        return {
            chip: successChipStyle,
            bar: '#22c55e',
        };
    }

    return {
        chip: {
            background: 'rgba(168,85,247,0.10)',
            color: '#7e22ce',
            border: '1px solid rgba(168,85,247,0.16)',
        } satisfies CSSProperties,
        bar: '#a855f7',
    };
};

export default function CourseAnalytics({ course, analytics }: Props) {
    const [jwtToken, setJwtToken] = useState('');
    const summary = analytics?.summary ?? defaultSummary;
    const groups = useMemo(() => analytics?.groups ?? [], [analytics?.groups]);

    const [liveGroups, setLiveGroups] = useState<GroupAnalytics[]>(groups);
    const [alerts, setAlerts] = useState<
        Array<{
            type: string;
            groupId: string;
            qualityScore?: number;
            message: string;
            timestamp: string;
        }>
    >([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        getAuthToken().then(setJwtToken).catch(console.error);
    }, []);

    useEffect(() => {
        setLiveGroups(groups);
    }, [groups]);

    const navItems = useLecturerNav('analytics', { courseId: course.id });

    useEffect(() => {
        if (!jwtToken) return;

        const apiUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

        const socket: Socket = io(apiUrl, {
            auth: { token: jwtToken },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('lecturer_alert', (data) => {
            if (data.courseId === course.id) {
                setAlerts((prev) => [data, ...prev].slice(0, 10));
                setLiveGroups((prev) =>
                    prev.map((group) =>
                        group.groupId === data.groupId
                            ? { ...group, qualityScore: data.qualityScore, needsAttention: true }
                            : group,
                    ),
                );
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [jwtToken, course.id]);

    const dismissAlert = (index: number) => {
        setAlerts((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    };

    const refreshAnalytics = useCallback(async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/api/analytics/course/${course.id}`, {
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setLiveGroups(data.groups);
            }
        } catch (error) {
            console.error('Failed to refresh analytics:', error);
        }
    }, [course.id, jwtToken]);

    const liveSummary = useMemo(() => {
        const qualityScores = liveGroups
            .map((group) => group.qualityScore)
            .filter((score): score is number => score !== undefined && score !== null);

        return {
            totalGroups: summary.totalGroups || liveGroups.length,
            totalMessages: summary.totalMessages,
            averageQualityScore:
                qualityScores.length > 0
                    ? qualityScores.reduce((total, score) => total + score, 0) / qualityScores.length
                    : summary.averageQualityScore,
            groupsNeedingAttention:
                liveGroups.filter((group) => group.needsAttention || ((group.qualityScore ?? 100) < 50)).length ||
                summary.groupsNeedingAttention,
        };
    }, [liveGroups, summary]);

    const summaryCards = [
        {
            label: 'Total Grup',
            value: liveSummary.totalGroups,
            detail: 'Tim kolaborasi yang sedang termonitor',
            icon: Users,
            color: '#88161c',
        },
        {
            label: 'Total Pesan',
            value: liveSummary.totalMessages,
            detail: 'Akumulasi diskusi dari seluruh grup',
            icon: MessageSquare,
            color: '#4A4A4A',
        },
        {
            label: 'Rata-rata Kualitas',
            value:
                liveSummary.averageQualityScore === null || liveSummary.averageQualityScore === undefined
                    ? '—'
                    : liveSummary.averageQualityScore.toFixed(1),
            detail: getStatusLabel(liveSummary.averageQualityScore),
            icon: BarChart3,
            color: getQualityAccent(liveSummary.averageQualityScore),
        },
        {
            label: 'Perlu Perhatian',
            value: liveSummary.groupsNeedingAttention,
            detail:
                liveSummary.groupsNeedingAttention > 0
                    ? 'Butuh tindak lanjut pengajar'
                    : 'Seluruh grup berada di jalur aman',
            icon: AlertTriangle,
            color: liveSummary.groupsNeedingAttention > 0 ? '#b91c1c' : '#166534',
        },
    ];

    const groupsWithEngagement = liveGroups.filter(
        (group) => group.engagementDistribution && Object.keys(group.engagementDistribution).length > 0,
    );

    return (
        <AppLayout title={`Analytics - ${course.name}`} navItems={navItems}>
            <Head title={`Analytics - ${course.name}`} />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={320} />
                <OrganicBlob className="top-32 -right-12" delay={-5} color="rgba(136, 22, 28, 0.03)" size={260} />

                <div className="relative space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <LiquidGlassCard intensity="medium" className="p-6 sm:p-8" lightMode={true}>
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={brandChipStyle}>
                                            {course.code}
                                        </span>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={neutralChipStyle}>
                                            {liveGroups.length} grup termonitor
                                        </span>
                                        <span
                                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                                            style={isConnected ? successChipStyle : neutralChipStyle}
                                        >
                                            <Activity className="h-3.5 w-3.5" />
                                            {isConnected ? 'Live analytics aktif' : 'Menunggu koneksi live'}
                                        </span>
                                    </div>

                                    <h1 className="mt-3 text-2xl font-bold sm:text-3xl" style={headingStyle}>
                                        Monitoring kualitas diskusi lintas grup
                                    </h1>
                                    <p className={`mt-2 max-w-2xl ${bodyTextClass}`}>
                                        Lihat kesehatan percakapan, sinyal SSRL, dan grup yang butuh intervensi tanpa mengubah
                                        alur refresh, socket alert, atau detail analytics yang sudah berjalan.
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
                                    <div className="rounded-[28px] p-4" style={glassPanelStyle}>
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Perlu perhatian</p>
                                        <p className="mt-2 text-2xl font-semibold" style={headingStyle}>
                                            {liveSummary.groupsNeedingAttention}
                                        </p>
                                        <p className="mt-1 text-xs text-[#6B7280]">Grup dengan skor rendah atau alert aktif.</p>
                                    </div>

                                    <SecondaryButton onClick={refreshAnalytics} className="justify-center">
                                        <RefreshCw className="h-4 w-4" />
                                        Refresh analytics
                                    </SecondaryButton>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    {alerts.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                        >
                            <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                                style={{
                                                    background: 'rgba(239,68,68,0.10)',
                                                    border: '1px solid rgba(239,68,68,0.18)',
                                                }}
                                            >
                                                <AlertTriangle className="h-5 w-5" style={{ color: '#b91c1c' }} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold" style={headingStyle}>
                                                    Alert kualitas terbaru
                                                </h2>
                                                <p className={`mt-1 ${bodyTextClass}`}>
                                                    Notifikasi dari socket dosen ditampilkan real-time dan tetap bisa ditutup satu per satu.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <span className="rounded-full px-3 py-1 text-xs font-medium" style={dangerChipStyle}>
                                        {alerts.length} alert aktif
                                    </span>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {alerts.map((alert, index) => (
                                        <div
                                            key={`${alert.groupId}-${alert.timestamp}`}
                                            className="flex flex-col gap-3 rounded-[24px] p-4 sm:flex-row sm:items-center sm:justify-between"
                                            style={{
                                                background: 'rgba(239,68,68,0.08)',
                                                border: '1px solid rgba(239,68,68,0.12)',
                                            }}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-[#7f1d1d]">{alert.message}</p>
                                                <p className="mt-1 text-xs text-[#b91c1c]">
                                                    Skor {alert.qualityScore?.toFixed(1) || '—'} •{' '}
                                                    {new Date(alert.timestamp).toLocaleTimeString('id-ID', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => dismissAlert(index)}
                                                className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                                                style={glassPanelStyle}
                                            >
                                                Tutup
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map((card, index) => (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08 * (index + 1) }}
                            >
                                <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-[#6B7280]">{card.label}</p>
                                            <p className="mt-2 text-3xl font-light" style={headingStyle}>
                                                {card.value}
                                            </p>
                                            <p className="mt-1 text-xs text-[#6B7280]">{card.detail}</p>
                                        </div>
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                            style={{
                                                background: `${card.color}12`,
                                                border: `1px solid ${card.color}20`,
                                            }}
                                        >
                                            <card.icon className="h-5 w-5" style={{ color: card.color }} />
                                        </div>
                                    </div>
                                </LiquidGlassCard>
                            </motion.div>
                        ))}
                    </div>

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
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.12)',
                                            }}
                                        >
                                            <Sparkles className="h-5 w-5" style={{ color: '#88161c' }} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold" style={headingStyle}>
                                                Analisis grup per tim
                                            </h2>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                Tabel analytics mempertahankan tautan detail, status kualitas, dan konteks diskusi untuk setiap grup.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <span className="rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                    {liveGroups.length} baris data
                                </span>
                            </div>

                            <div className="mt-5 overflow-hidden rounded-[28px]" style={glassPanelStyle}>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border-separate border-spacing-0">
                                        <thead style={tableHeaderStyle}>
                                            <tr>
                                                {['Grup', 'Anggota', 'Pesan', 'Skor kualitas', 'Status', 'Aksi'].map((label) => (
                                                    <th
                                                        key={label}
                                                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] ${
                                                            label === 'Aksi' ? 'text-right' : label === 'Grup' ? 'text-left' : 'text-center'
                                                        }`}
                                                    >
                                                        {label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {liveGroups.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-14 text-center">
                                                        <div
                                                            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                                                            style={{
                                                                background: 'rgba(136,22,28,0.08)',
                                                                border: '1px solid rgba(136,22,28,0.12)',
                                                            }}
                                                        >
                                                            <BarChart3 className="h-6 w-6" style={{ color: '#88161c' }} />
                                                        </div>
                                                        <p className="mt-4 text-base font-semibold" style={headingStyle}>
                                                            Belum ada data analytics grup
                                                        </p>
                                                        <p className={`mx-auto mt-2 max-w-md ${bodyTextClass}`}>
                                                            Begitu grup mulai berdiskusi, ringkasan kualitas dan engagement akan muncul di sini.
                                                        </p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                liveGroups.map((group) => {
                                                    const rowStyle: CSSProperties | undefined = group.needsAttention
                                                        ? {
                                                              background: 'rgba(245,158,11,0.08)',
                                                          }
                                                        : undefined;

                                                    return (
                                                        <tr key={group.groupId} style={rowStyle}>
                                                            <td className="border-t border-white/50 px-4 py-4 text-left align-top">
                                                                <div className="flex items-center gap-3">
                                                                    <span
                                                                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold"
                                                                        style={brandChipStyle}
                                                                    >
                                                                        {group.groupName.charAt(0).toUpperCase()}
                                                                    </span>
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold" style={headingStyle}>
                                                                            {group.groupName}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-[#6B7280]">
                                                                            {group.chatSpaceCount} sesi diskusi
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="border-t border-white/50 px-4 py-4 text-center align-top text-sm text-[#4A4A4A]">
                                                                {group.memberCount}
                                                            </td>
                                                            <td className="border-t border-white/50 px-4 py-4 text-center align-top text-sm text-[#4A4A4A]">
                                                                {group.messageCount}
                                                            </td>
                                                            <td className="border-t border-white/50 px-4 py-4 text-center align-top">
                                                                <span
                                                                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                                                                    style={getQualityChipStyle(group.qualityScore)}
                                                                >
                                                                    {group.qualityScore?.toFixed(1) || '—'}
                                                                </span>
                                                            </td>
                                                            <td className="border-t border-white/50 px-4 py-4 text-center align-top">
                                                                <div className="inline-flex flex-col items-center gap-2">
                                                                    <span
                                                                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                                                                        style={getQualityChipStyle(group.qualityScore)}
                                                                    >
                                                                        {getStatusLabel(group.qualityScore)}
                                                                    </span>
                                                                    {group.needsAttention && (
                                                                        <span className="text-[11px] font-medium text-[#92400e]">Alert aktif</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="border-t border-white/50 px-4 py-4 text-right align-top">
                                                                <Link
                                                                    href={lecturer.analytics.group.url({
                                                                        course: course.id,
                                                                        group: group.groupId,
                                                                    })}
                                                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
                                                                    style={glassPanelStyle}
                                                                >
                                                                    Detail
                                                                    <ArrowRight className="h-4 w-4" />
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    {groupsWithEngagement.length > 0 && (
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
                                                    background: 'rgba(59,130,246,0.10)',
                                                    border: '1px solid rgba(59,130,246,0.16)',
                                                }}
                                            >
                                                <Activity className="h-5 w-5" style={{ color: '#1d4ed8' }} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold" style={headingStyle}>
                                                    Distribusi engagement dan rekomendasi
                                                </h2>
                                                <p className={`mt-1 ${bodyTextClass}`}>
                                                    Tiap kartu memperlihatkan distribusi sinyal keterlibatan dan catatan intervensi yang sudah tersedia.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <span className="rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                        {groupsWithEngagement.length} grup dengan data SSRL
                                    </span>
                                </div>

                                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                                    {groupsWithEngagement.map((group) => {
                                        const total = Object.values(group.engagementDistribution || {}).reduce(
                                            (sum, value) => sum + value,
                                            0,
                                        );

                                        return (
                                            <div key={group.groupId} className="rounded-[28px] p-5" style={glassPanelStyle}>
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="rounded-full px-3 py-1 text-xs font-medium" style={brandChipStyle}>
                                                                {group.groupName}
                                                            </span>
                                                            <span
                                                                className="rounded-full px-3 py-1 text-xs font-medium"
                                                                style={getQualityChipStyle(group.qualityScore)}
                                                            >
                                                                {getStatusLabel(group.qualityScore)}
                                                            </span>
                                                        </div>
                                                        <p className="mt-3 text-sm font-medium" style={headingStyle}>
                                                            Peta distribusi percakapan
                                                        </p>
                                                        <p className="mt-1 text-xs text-[#6B7280]">
                                                            {total} indikator engagement terklasifikasi dari percakapan grup.
                                                        </p>
                                                    </div>
                                                    <Link
                                                        href={lecturer.analytics.group.url({ course: course.id, group: group.groupId })}
                                                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-transform hover:-translate-y-0.5"
                                                        style={glassPanelStyle}
                                                    >
                                                        Buka detail
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </Link>
                                                </div>

                                                <div className="mt-4 space-y-3">
                                                    {Object.entries(group.engagementDistribution || {}).map(([type, count]) => {
                                                        const percentage = total > 0 ? (count / total) * 100 : 0;
                                                        const engagementStyle = getEngagementStyle(type);

                                                        return (
                                                            <div key={type} className="space-y-2 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.48)' }}>
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <span
                                                                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize"
                                                                        style={engagementStyle.chip}
                                                                    >
                                                                        {type}
                                                                    </span>
                                                                    <span className="text-sm font-medium text-[#4A4A4A]">
                                                                        {count} • {percentage.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 overflow-hidden rounded-full bg-white/70">
                                                                    <div
                                                                        className="h-full rounded-full transition-all duration-500"
                                                                        style={{ width: `${percentage}%`, background: engagementStyle.bar }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {group.recommendation && (
                                                    <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.45)' }}>
                                                        <div className="flex items-start gap-3">
                                                            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: '#88161c' }} />
                                                            <p className="text-sm leading-6 text-[#6B7280]">{group.recommendation}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
