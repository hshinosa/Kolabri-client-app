import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    ChevronRight,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { LiquidGlassCard, OrganicBlob } from '@/components/Welcome/utils/helpers';
import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course } from '@/types';
import {
    InteractiveTrendChart,
    type MetricOption,
    StudentBreakdownList,
    IndividualStudentAnalytics,
} from '@/components/analytics';
import type { DateRange } from '@/components/analytics';


interface TrendDataPoint {
    date: string;
    [key: string]: string | number;
}

interface AnalyticsSummary {
    totalGroups: number;
    averageQualityScore: number | null;
    totalMessages: number;
    groupsNeedingAttention: number;
}

interface AnalyticsData {
    summary: AnalyticsSummary;
    groups: Array<{ id: string; name: string; qualityScore: number | null; memberCount: number }>;
    trends: TrendDataPoint[] | null;
}

interface Props {
    course: Course;
    analytics: AnalyticsData;
    socketUrl?: string;
}

const headingStyle = { color: 'var(--color-brand-dark)' } as const;
const bodyTextClass = 'text-sm text-brand-muted-dark font-sans';
const badgeClass = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium';

const brandChipStyle = {
    background: 'rgba(136,22,28,0.08)',
    color: 'var(--color-brand-primary)',
    border: '1px solid rgba(136,22,28,0.15)',
} as const;

const glassPanelStyle = {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(136,22,28,0.10)',
} as const;

const TREND_METRICS: MetricOption[] = [
    { value: 'quality_score', label: 'Skor Kualitas', color: 'var(--color-brand-primary)' },
    { value: 'hot_percentage', label: 'HOT %', color: '#334155' },
    { value: 'engagement', label: 'Engagement', color: '#166534' },
    { value: 'lexical_variety', label: 'Lexical Variety', color: '#92400e' },
];

const getQualityColor = (score: number | null) => {
    if (score === null) return '#9CA3AF';
    if (score >= 70) return '#166534';
    if (score >= 50) return '#92400e';
    return '#b91c1c';
};

const getQualityLabel = (score: number | null) => {
    if (score === null) return 'Belum Ada Data';
    if (score >= 70) return 'Baik';
    if (score >= 50) return 'Perlu Perhatian';
    return 'Butuh Intervensi';
};

export default function AnalyticsDetail({ course, analytics }: Props) {
    const navItems = useLecturerNav('analytics');
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
    const [preset, setPreset] = useState<string>('');


    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const safeAnalytics = useMemo(() => analytics ?? { summary: { totalGroups: 0, averageQualityScore: null, totalMessages: 0, groupsNeedingAttention: 0 }, groups: [], trends: null }, [analytics]);
    const summary = safeAnalytics.summary;

    const handleBrushChange = useCallback((_startIndex: number, _endIndex: number) => {}, []);
    const handleDateChange = useCallback((range: DateRange, newPreset?: string) => {
        setDateRange(range);
        setPreset(newPreset ?? '');
    }, []);
    const preserveBreakdownScroll = useCallback((action: () => void) => {
        const scrollY = window.scrollY;
        action();
        requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'auto' });
        });
    }, []);


    const statCards = [
        {
            icon: TrendingUp,
            label: 'Rata-rata Skor',
            value: summary.averageQualityScore !== null ? summary.averageQualityScore.toFixed(1) : 'N/A',
            color: getQualityColor(summary.averageQualityScore),
            detail: getQualityLabel(summary.averageQualityScore),
        },
        {
            icon: Users,
            label: 'Total Grup',
            value: summary.totalGroups,
            color: '#334155',
            detail: 'Grup diskusi aktif',
        },
        {
            icon: BarChart3,
            label: 'Total Pesan',
            value: summary.totalMessages.toLocaleString(),
            color: '#166534',
            detail: 'Pesan terkirim',
        },
        {
            icon: TrendingUp,
            label: 'Perlu Perhatian',
            value: summary.groupsNeedingAttention,
            color: '#92400e',
            detail: 'Grup butuh intervensi',
        },
    ];

    return (
        <AppLayout navItems={navItems} title={`Analitik ${course.code}`}>
            <Head title={`Detail Analitik - ${course.name}`} />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={300} />
                <OrganicBlob className="top-36 -right-16" delay={-5} color="rgba(136, 22, 28, 0.03)" size={240} />

                <div className="relative space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <LiquidGlassCard intensity="medium" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6 sm:p-8" lightMode>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div className="max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-brand-muted-dark">
                                        <Link href={lecturer.courses.index.url()} className="transition-colors hover:text-brand-primary">
                                            Kelas
                                        </Link>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                        <Link href={lecturer.courses.show.url({ course: course.id })} className="transition-colors hover:text-brand-primary">
                                            {course.code}
                                        </Link>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                        <span style={headingStyle}>Analitik</span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className={badgeClass} style={brandChipStyle}>
                                            {course.code}
                                        </span>
                                    </div>

                                    <h1 className="mt-3 text-2xl font-bold sm:text-3xl" style={headingStyle}>
                                        Analitik {course.name}
                                    </h1>
                                    <p className={`mt-2 max-w-2xl ${bodyTextClass}`}>
                                        Analisis performa diskusi kelas, tren metrik, performa kelompok, dan rincian mahasiswa dalam satu tampilan yang konsisten dengan halaman dosen lain.
                                    </p>
                                </div>

                                <div className="flex justify-start lg:justify-end">
                                    <Link
                                        href={lecturer.courses.show.url({ course: course.id })}
                                        className="inline-flex min-w-[170px] items-center justify-center rounded-full border border-brand-primary/15 bg-white px-4 py-2 text-sm font-medium text-brand-primary shadow-sm transition-colors hover:bg-brand-primary/5"
                                    >
                                        Kembali ke kelas
                                    </Link>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {statCards.map((card, i) => (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08 * i }}
                            >
                                <LiquidGlassCard intensity="light" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-5" lightMode>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-brand-muted-dark">{card.label}</p>
                                            <p className="mt-2 text-3xl font-light" style={headingStyle}>{card.value}</p>
                                            <p className="mt-1 text-xs text-brand-muted-dark">{card.detail}</p>
                                        </div>
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                                            style={{ background: `${card.color}12`, borderColor: `${card.color}20` }}
                                        >
                                            <card.icon className="h-5 w-5" style={{ color: card.color }} />
                                        </div>
                                    </div>
                                </LiquidGlassCard>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <LiquidGlassCard intensity="light" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6" lightMode>
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold" style={headingStyle}>Trend performa</h2>
                                    <p className={`mt-1 ${bodyTextClass}`}>Pantau perubahan metrik kualitas diskusi sepanjang periode aktif.</p>
                                </div>
                            </div>
                            {safeAnalytics.trends && safeAnalytics.trends.length > 0 ? (
                                <div className="rounded-2xl border border-brand-primary/10 bg-white/90 p-3 sm:p-4">
                                    <InteractiveTrendChart
                                        data={safeAnalytics.trends}
                                        metrics={TREND_METRICS}
                                        title="Tren per Metrik"
                                        height={350}
                                        showBenchmark={false}
                                        onBrushChange={handleBrushChange}
                                    />
                                </div>
                            ) : (
                                <div className="flex h-48 items-center justify-center rounded-2xl border border-brand-primary/10 bg-white/90" style={glassPanelStyle}>
                                    <p className="text-sm text-gray-600">Belum ada data tren. Data akan muncul setelah ada aktivitas diskusi.</p>
                                </div>
                            )}
                        </LiquidGlassCard>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <LiquidGlassCard intensity="light" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6" lightMode>
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold" style={headingStyle}>Rincian per kelompok</h2>
                                    <p className={`mt-1 ${bodyTextClass}`}>Masuk ke detail tiap kelompok untuk melihat kualitas diskusi dan aktivitas terbaru.</p>
                                </div>
                            </div>
                            {safeAnalytics.groups && safeAnalytics.groups.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {safeAnalytics.groups.map((group) => (
                                        <Link
                                            key={group.id}
                                            href={lecturer.analytics.group.url({
                                                course: course.id,
                                                group: group.id,
                                            })}
                                            className="block rounded-2xl border border-brand-primary/10 bg-white/90 p-4 transition-shadow hover:shadow-md"
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-semibold" style={headingStyle}>{group.name}</h3>
                                                <span
                                                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                                                    style={{
                                                        background: group.qualityScore !== null && group.qualityScore >= 70 ? 'rgba(22,101,52,0.1)' : 'rgba(220,38,38,0.1)',
                                                        color: group.qualityScore !== null && group.qualityScore >= 70 ? '#166534' : '#dc2626',
                                                    }}
                                                >
                                                    {group.qualityScore !== null ? group.qualityScore.toFixed(1) : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Users className="h-3.5 w-3.5" />
                                                <span>{group.memberCount} anggota</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-32 items-center justify-center rounded-2xl border border-brand-primary/10 bg-white/90" style={glassPanelStyle}>
                                    <p className="text-sm text-gray-600">Belum ada data kelompok.</p>
                                </div>
                            )}
                        </LiquidGlassCard>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <LiquidGlassCard intensity="light" className="rounded-2xl border border-brand-primary/10 bg-white/95 p-6" lightMode>
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold" style={headingStyle}>Breakdown mahasiswa</h2>
                                <p className={`mt-1 ${bodyTextClass}`}>Telusuri performa individual tanpa keluar dari konteks analitik kelas.</p>
                            </div>
                            {selectedStudentId ? (
                                <IndividualStudentAnalytics
                                    courseId={course.id}
                                    studentId={selectedStudentId}
                                    onBack={() => preserveBreakdownScroll(() => setSelectedStudentId(null))}
                                    startDate={dateRange.startDate}
                                    endDate={dateRange.endDate}
                                    preset={preset}
                                />
                            ) : (
                                <StudentBreakdownList
                                    courseId={course.id}
                                    startDate={dateRange.startDate}
                                    endDate={dateRange.endDate}
                                    preset={preset}
                                    onSelectStudent={(studentId) => preserveBreakdownScroll(() => setSelectedStudentId(studentId))}
                                />
                            )}
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </div>
        </AppLayout>
    );
}
