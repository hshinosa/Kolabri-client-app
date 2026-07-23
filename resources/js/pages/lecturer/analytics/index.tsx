import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BarChart3,
    MessageSquare,
    RefreshCw,
    Lightbulb,
    TrendingUp,
    Users,
} from 'lucide-react';
import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { resolveSocketUrl } from '@/lib/socket-url';

import { DateRangePicker, ExportMenu, TrendChart, type TrendDataPoint } from '@/components/analytics';
import { LiquidGlassCard, OrganicBlob, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { DashboardSkeleton, SkeletonChart } from '@/components/ui/skeletons';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course } from '@/types';
import { getAuthToken } from '@/lib/getAuthToken';
import { toast } from '@/components/ui/toaster';
import CourseExportButton from '@/components/CourseExportButton';

interface GroupAnalytics {
    id?: string;
    name?: string;
    groupId?: string;
    groupName?: string;
    memberCount: number;
    sessionDiscussionCount: number;
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

interface TrendsData {
    engagement?: TrendDataPoint[];
    completion?: TrendDataPoint[];
    attendance?: TrendDataPoint[];
}

interface FiltersState {
    startDate?: string;
    endDate?: string;
    preset?: string;
}

interface Props {
    course: Course;
    analytics: {
        summary: CourseAnalyticsSummary;
        groups: GroupAnalytics[];
        trends?: TrendsData | null;
    };
    filters?: FiltersState;
}

const headingStyle = {
    color: 'var(--color-brand-dark)',
} as const;

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
                background: 'rgba(71,85,105,0.10)',
                color: '#334155',
                border: '1px solid rgba(71,85,105,0.18)',
            } satisfies CSSProperties,
            bar: '#475569',
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
            background: 'rgba(180,83,9,0.10)',
            color: '#92400e',
            border: '1px solid rgba(180,83,9,0.18)',
        } satisfies CSSProperties,
        bar: '#b45309',
    };
};

type TrendMetric = 'engagement' | 'completion' | 'attendance';

const TREND_METRIC_OPTIONS: Array<{ value: TrendMetric; label: string }> = [
    { value: 'engagement', label: 'Engagement' },
    { value: 'completion', label: 'Completion Rate' },
    { value: 'attendance', label: 'Attendance' },
];

export default function CourseAnalytics({ course, analytics, filters }: Props) {
    const [isLoading, setIsLoading] = useState(true);
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
    const [selectedMetric, setSelectedMetric] = useState<TrendMetric>('engagement');
    const [trendData, setTrendData] = useState<TrendsData | null>(analytics?.trends ?? null);
    const [isLoadingTrends, setIsLoadingTrends] = useState(false);
    const [showChartSkeleton, setShowChartSkeleton] = useState(false);

    const [activePreset, setActivePreset] = useState<string | undefined>(filters?.preset);
    const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string } | undefined>(
        filters?.startDate && filters?.endDate
            ? { startDate: filters.startDate, endDate: filters.endDate }
            : undefined,
    );

    useEffect(() => {
        setIsLoading(false);
    }, []);

    useEffect(() => {
        getAuthToken().then(setJwtToken).catch((err) => {
            console.error(err);
            toast.error('Gagal mengambil token autentikasi. Silakan muat ulang halaman.');
        });
    }, []);

    useEffect(() => {
        setLiveGroups(groups);
    }, [groups]);

    const navItems = useLecturerNav('analytics');

    useEffect(() => {
        if (!jwtToken) return;

        const apiUrl = resolveSocketUrl();

        const socket: Socket = io(apiUrl, {
            auth: { token: jwtToken },
            transports: ['polling'],
            upgrade: false,
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
            const params = new URLSearchParams();
            if (dateRange?.startDate) params.set('start_date', dateRange.startDate);
            if (dateRange?.endDate) params.set('end_date', dateRange.endDate);
            if (activePreset) params.set('preset', activePreset);

            const response = await fetch(`/lecturer/courses/${course.id}/analytics/live?${params.toString()}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                setLiveGroups(data.groups);
            }
        } catch (error) {
            console.error('Failed to refresh analytics:', error);
            toast.error('Gagal memuat analitik');
        }
    }, [course.id, dateRange, activePreset]);

    const fetchTrends = useCallback(async (metric: TrendMetric) => {
        const startTime = Date.now();
        setIsLoadingTrends(true);
        setShowChartSkeleton(true);
        
        try {
            const params = new URLSearchParams({ metric });
            if (dateRange?.startDate) params.set('start_date', dateRange.startDate);
            if (dateRange?.endDate) params.set('end_date', dateRange.endDate);
            if (activePreset) params.set('preset', activePreset);

            const response = await fetch(`/lecturer/courses/${course.id}/analytics/trends?${params.toString()}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                setTrendData((prev) => ({
                    ...prev,
                    [metric]: data.points ?? data,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch trends:', error);
            toast.error('Gagal memuat tren');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 300 - elapsed);
            
            setTimeout(() => {
                setIsLoadingTrends(false);
                setShowChartSkeleton(false);
            }, remaining);
        }
    }, [course.id, dateRange, activePreset]);

    const handleDateChange = useCallback(
        (range: { startDate: string; endDate: string }, preset?: string) => {
            setDateRange(range);
            setActivePreset(preset);

            const params: Record<string, string> = {};
            if (preset) {
                params.preset = preset;
            } else {
                params.start_date = range.startDate;
                params.end_date = range.endDate;
            }

            router.get(
                lecturer.analytics.index.url({ course: course.id }),
                params,
                { preserveState: true, preserveScroll: true },
            );
        },
        [course.id],
    );

    const handleMetricChange = useCallback(
        (metric: TrendMetric) => {
            setSelectedMetric(metric);
            if (!trendData?.[metric]) {
                fetchTrends(metric);
            }
        },
        [trendData, fetchTrends],
    );

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

    const currentTrendData = trendData?.[selectedMetric] ?? [];

    return (
        <AppLayout title={`Analitik - ${course.name}`} navItems={navItems}>
            <Head title={`Analitik - ${course.name}`} />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={320} />
                <OrganicBlob className="top-32 -right-12" delay={-5} color="rgba(136, 22, 28, 0.03)" size={260} />

                <div className="relative space-y-6">
                    {isLoading ? (
                        <DashboardSkeleton />
                    ) : (
                    <>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                         <LiquidGlassCard intensity="medium" className="p-6 sm:p-8" lightMode={true}>
                             <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                 <div className="flex items-start gap-4">
                                     <div
                                         className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                                         style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                     >
                                         <BarChart3 className="h-6 w-6" style={{ color: '#88161c' }} />
                                     </div>
                                     <div>
                                         <h1 className="text-2xl font-bold" style={headingStyle}>
                                             {course.name}
                                         </h1>
                                         <p className="mt-1 text-sm text-brand-muted-dark">
                                            {course.code} · Dasbor Analitik
                                         </p>
                                     </div>
                                 </div>

                                 <div className="flex flex-wrap items-center gap-3">
                                      <CourseExportButton courseId={course.id} />
                                      <SecondaryButton onClick={refreshAnalytics}>
                                          <RefreshCw className="mr-2 h-4 w-4" />
                                          Muat ulang
                                      </SecondaryButton>
                                      <div className="flex items-center gap-2">
                                          <div
                                              className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-300'}`}
                                          />
                                          <span className="text-xs text-brand-muted-dark">
                                              {isConnected ? 'Live' : 'Offline'}
                                          </span>
                                      </div>
                                  </div>
                             </div>
                         </LiquidGlassCard>
                    </motion.div>

                    {alerts.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                            <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                                <div className="space-y-3">
                                    {alerts.map((alert, index) => (
                                        <div
                                            key={`${alert.groupId}-${alert.timestamp}`}
                                            className="flex items-center justify-between gap-4 rounded-2xl p-4"
                                            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-[#7f1d1d]">{alert.message}</p>
                                                    <p className="mt-1 text-xs text-[#b91c1c]">
                                                        Skor {alert.qualityScore?.toFixed(1) || '—'} •{' '}
                                                        {new Date(alert.timestamp).toLocaleTimeString('id-ID', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
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
                                            <p className="text-sm text-brand-muted-dark">{card.label}</p>
                                            <p className="mt-2 text-3xl font-light" style={headingStyle}>
                                                {card.value}
                                            </p>
                                            <p className="mt-1 text-xs text-brand-muted-dark">{card.detail}</p>
                                        </div>
                                        <div
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                            style={{ background: `${card.color}12`, border: `1px solid ${card.color}20` }}
                                        >
                                            <card.icon className="h-5 w-5" style={{ color: card.color }} />
                                        </div>
                                    </div>
                                </LiquidGlassCard>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" style={{ color: '#88161c' }} />
                                    <h2 className="text-lg font-semibold" style={headingStyle}>
                                        Tren Analitik
                                    </h2>
                                </div>
                                <div className="flex gap-2">
                                    {TREND_METRIC_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleMetricChange(option.value)}
                                            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                                            style={
                                                selectedMetric === option.value
                                                    ? { background: 'rgba(136,22,28,0.12)', color: '#88161c', border: '1px solid rgba(136,22,28,0.25)' }
                                                    : { background: 'rgba(136,22,28,0.04)', color: '#6B7280', border: '1px solid rgba(136,22,28,0.08)' }
                                            }
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {showChartSkeleton ? (
                                <SkeletonChart height="h-[300px]" />
                            ) : (
                                <TrendChart
                                    data={currentTrendData}
                                    lines={[
                                        {
                                            dataKey: 'value',
                                            color: '#88161c',
                                            label: TREND_METRIC_OPTIONS.find((o) => o.value === selectedMetric)?.label ?? selectedMetric,
                                        },
                                    ]}
                                    height={300}
                                    yAxisLabel={selectedMetric === 'engagement' ? 'Skor' : '%'}
                                    targetLine={selectedMetric === 'completion' ? 70 : undefined}
                                    targetLabel="Target"
                                />
                            )}
                        </LiquidGlassCard>
                    </motion.div>

                    {liveGroups.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                            <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                                <div className="mb-6 flex items-center gap-2">
                                    <Users className="h-5 w-5" style={{ color: '#88161c' }} />
                                    <h2 className="text-lg font-semibold" style={headingStyle}>
                                        Detail per Grup
                                    </h2>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted-dark"
                                                    style={tableHeaderStyle}
                                                >
                                                    Grup
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-brand-muted-dark"
                                                    style={tableHeaderStyle}
                                                >
                                                    Anggota
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-brand-muted-dark"
                                                    style={tableHeaderStyle}
                                                >
                                                    Pesan
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-brand-muted-dark"
                                                    style={tableHeaderStyle}
                                                >
                                                    Kualitas
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-brand-muted-dark"
                                                    style={tableHeaderStyle}
                                                >
                                                    Status
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-brand-muted-dark"
                                                    style={tableHeaderStyle}
                                                >
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {liveGroups.map((group) => {
                                                const groupId = group.groupId ?? group.id;
                                                const groupName = group.groupName ?? group.name ?? 'Grup tanpa nama';
                                                const engagementEntries = Object.entries(group.engagementDistribution || {});
                                                const total = engagementEntries.reduce((sum, [, count]) => sum + (count as number), 0);

                                                return (
                                                    <tr key={groupId ?? group.name} className="group/row">
                                                        <td className="border-t border-white/50 px-4 py-4 align-top">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                                                    style={{
                                                                        background: group.needsAttention
                                                                            ? 'rgba(239,68,68,0.08)'
                                                                            : 'rgba(136,22,28,0.06)',
                                                                        border: `1px solid ${group.needsAttention ? 'rgba(239,68,68,0.15)' : 'rgba(136,22,28,0.1)'}`,
                                                                    }}
                                                                >
                                                                    <Users
                                                                        className="h-4 w-4"
                                                                        style={{ color: group.needsAttention ? '#dc2626' : '#88161c' }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-brand-dark">
                                                                        {groupName}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs text-brand-muted-dark">
                                                                        {group.sessionDiscussionCount} sesi diskusi
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="border-t border-white/50 px-4 py-4 text-center align-top text-sm text-brand-dark">
                                                            {group.memberCount}
                                                        </td>
                                                        <td className="border-t border-white/50 px-4 py-4 text-center align-top text-sm text-brand-dark">
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
                                                            <span
                                                                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                                                                style={getQualityChipStyle(group.qualityScore)}
                                                            >
                                                                {getStatusLabel(group.qualityScore)}
                                                            </span>
                                                        </td>
                                                        <td className="border-t border-white/50 px-4 py-4 text-center align-top">
                                                            {groupId ? (
                                                                <Link
                                                                    href={lecturer.analytics.group.url({
                                                                        course: course.id,
                                                                        group: groupId,
                                                                    })}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                                                                    style={brandChipStyle}
                                                                >
                                                                    Detail
                                                                    <ArrowRight className="h-3 w-3" />
                                                                </Link>
                                                            ) : (
                                                                <span className="text-xs text-brand-muted-dark">Detail tidak tersedia</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {liveGroups.filter((g) => g.engagementDistribution && Object.keys(g.engagementDistribution).length > 0)
                                    .length > 0 && (
                                    <div className="mt-8 space-y-6">
                                        <h3 className="text-sm font-semibold text-brand-dark">Distribusi Engagement per Grup</h3>
                                        {liveGroups
                                            .filter(
                                                (group) =>
                                                    group.engagementDistribution &&
                                                    Object.keys(group.engagementDistribution).length > 0,
                                            )
                                            .map((group) => {
                                                const groupId = group.groupId ?? group.id;
                                                const groupName = group.groupName ?? group.name ?? 'Grup tanpa nama';
                                                const engagementEntries = Object.entries(group.engagementDistribution!);
                                                const total = engagementEntries.reduce((sum, [, count]) => sum + (count as number), 0);

                                                return (
                                                    <div key={groupId ?? group.name} className="rounded-2xl p-4" style={glassPanelStyle}>
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <p className="text-sm font-medium text-brand-dark">
                                                                {groupName}
                                                            </p>
                                                            <span className="text-xs text-brand-muted-dark">{total} total</span>
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
                                                                            <span className="text-sm font-medium text-brand-dark">
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
                                                                    <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: '#88161c' }} />
                                                                    <p className="text-sm leading-6 text-brand-muted-dark">{group.recommendation}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </LiquidGlassCard>
                        </motion.div>
                    )}
                    </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
