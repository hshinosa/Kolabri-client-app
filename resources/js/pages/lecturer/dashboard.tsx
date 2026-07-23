import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Activity, BookOpen, Plus, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { resolveSocketUrl } from '@/lib/socket-url';

import Breadcrumbs from '@/components/dashboard/Breadcrumbs';
import { EnhancedStatCard } from '@/components/dashboard/EnhancedStatCard';
import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { LiquidGlassCard, OrganicBlob } from '@/components/Welcome/utils/helpers';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course, SharedData } from '@/types';
import { getAuthToken } from '@/lib/getAuthToken';
import { toast } from '@/components/ui/toaster';

interface DashboardStats {
    totalCourses: number;
    totalStudents: number;
    totalGroups: number;
    coursesNeedingAttention: number;
}

interface ActivityItem {
    id: string;
    senderName: string;
    senderType?: string;
    content: string;
    createdAt: string;
    groupName?: string;
    courseName?: string;
}

interface ClassDistributionItem {
    name: string;
    code: string;
    groupCount: number;
    studentCount: number;
}

interface TrendDataPoint {
    week: string;
    messageCount: number;
    lexicalVariety: number;
    hotPercentage: number;
}

interface QualityTrendItem {
    courseName: string;
    courseCode: string;
    data: TrendDataPoint[];
}

interface ChartData {
    classDistribution: ClassDistributionItem[];
    qualityTrends: QualityTrendItem[];
}

interface Props {
    stats: DashboardStats;
    recentCourses: Course[];
    recentActivity: ActivityItem[];
    chartData: ChartData;
}

const COLORS = ['var(--color-brand-primary)', 'var(--color-brand-dark)', 'var(--color-brand-muted)', '#92400e', '#166534', '#7c3aed', '#0369a1', '#be123c', '#854d0e', '#15803d', '#6d28d9', '#0e7490'];

export default function LecturerDashboard({ stats, recentActivity, chartData }: Props) {
    const { auth } = usePage<SharedData>().props;
    const navItems = useLecturerNav('dashboard');

    const [liveActivity, setLiveActivity] = useState<ActivityItem[]>(recentActivity);
    const [isConnected, setIsConnected] = useState(false);
    const [jwtToken, setJwtToken] = useState<string | null>(null);
    const maxLiveItems = 5;

    useEffect(() => {
        getAuthToken().then(setJwtToken).catch(() => {
            toast.error('Gagal mengambil token autentikasi. Silakan muat ulang halaman.');
        });
    }, []);

    useEffect(() => {
        if (!jwtToken) return;

        const apiUrl = resolveSocketUrl();
        const socket: Socket = io(apiUrl, {
            auth: { token: jwtToken },
            // Nginx/proxy on VPS mishandles socket.io websocket upgrades ("Invalid frame header").
            transports: ['polling'],
            upgrade: false,
        });

        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('connect_error', () => setIsConnected(false));

        socket.on('activity_feed', (data: any) => {
            if (data.senderType === 'system' || data.isIntervention) return;
            const newItem: ActivityItem = {
                id: data.id || String(Date.now()),
                senderName: data.senderName || 'Unknown',
                senderType: data.senderType || 'student',
                content: (data.content || '').substring(0, 150),
                createdAt: data.createdAt || new Date().toISOString(),
                groupName: data.groupName || '',
                courseName: data.courseName || '',
            };
            setLiveActivity(prev => [newItem, ...prev].slice(0, maxLiveItems));
        });

        return () => { socket.disconnect(); };
    }, [jwtToken]);


    const statCards = [
        { label: 'Kelas Aktif', value: stats.totalCourses, icon: BookOpen, color: '#88161c' },
        { label: 'Total Mahasiswa', value: stats.totalStudents, icon: Users, color: '#4A4A4A' },
        { label: 'Grup Aktif', value: stats.totalGroups, icon: Activity, color: '#6B7280' },
        { label: 'Perlu Perhatian', value: stats.coursesNeedingAttention, icon: AlertTriangle, color: '#92400e' },
    ];

    const totalGroups = useMemo(
        () => chartData.classDistribution.reduce((sum, c) => sum + c.groupCount, 0),
        [chartData.classDistribution]
    );

    return (
        <AppLayout title="Dasbor" navItems={navItems}>
            <Head title="Dasbor Dosen" />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={300} />
                <OrganicBlob className="top-40 -right-20" delay={-5} color="rgba(136, 22, 28, 0.03)" size={250} />

                <div className="relative space-y-6">
                    <Breadcrumbs items={[{ label: 'Dasbor' }]} />

                    <div className="flex items-center justify-between">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex-1">
                            <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold font-sans text-brand-dark">
                                        Selamat datang kembali, {auth.user?.name}!
                                    </h1>
                                    <p className="mt-2 text-brand-muted-dark">Kelola kelas Anda dan pantau kolaborasi mahasiswa dari satu tempat.</p>
                                </div>
                                <div
                                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <BookOpen className="h-7 w-7 text-brand-primary" />
                                </div>
                            </div>
                        </LiquidGlassCard>
                        </motion.div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {statCards.map((stat, index) => (
                            <EnhancedStatCard
                                key={stat.label}
                                label={stat.label}
                                value={stat.value}
                                icon={stat.icon}
                                color={stat.color}
                                isPrimary={index === 0}
                                forceLight
                            />
                        ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
                            <div className="space-y-4">
                                <LiquidGlassCard intensity="medium" className="p-4" lightMode={true}>
                                    <h2 className="mb-3 text-base font-semibold font-sans text-brand-dark">
                                        Aksi Cepat
                                    </h2>
                                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                                        <Link
                                            href={lecturer.courses.create.url()}
                                            className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 transition-colors hover:bg-gray-100"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(136,22,28,0.08)' }}>
                                                <Plus className="h-4 w-4 text-brand-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-brand-dark">Buat Kelas</p>
                                                <p className="truncate text-[11px] text-brand-muted-dark">Kelas baru</p>
                                            </div>
                                        </Link>

                                        <Link
                                            href={lecturer.courses.index.url()}
                                            className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 transition-colors hover:bg-gray-100"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(74,74,74,0.08)' }}>
                                                <BookOpen className="h-4 w-4 text-brand-dark" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-brand-dark">Kelola Kelas</p>
                                                <p className="truncate text-[11px] text-brand-muted-dark">Semua kelas</p>
                                            </div>
                                        </Link>

                                        <Link
                                            href={lecturer.courses.index.url()}
                                            className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 transition-colors hover:bg-gray-100"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(107,114,128,0.08)' }}>
                                                <Users className="h-4 w-4 text-brand-muted-dark" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-brand-dark">Mahasiswa</p>
                                                <p className="truncate text-[11px] text-brand-muted-dark">Anggota grup</p>
                                            </div>
                                        </Link>
                                    </div>
                                </LiquidGlassCard>

                            <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 className="h-5 w-5 text-brand-muted-dark" />
                                    <h2 className="text-lg font-semibold font-sans text-brand-dark">
                                        Distribusi Kelas
                                    </h2>
                                </div>

                                {chartData.classDistribution.length === 0 ? (
                                    <div className="text-center py-8">
                                        <BarChart3 className="mx-auto h-10 w-10 text-brand-muted-dark opacity-50" />
                                        <p className="mt-3 text-sm text-brand-muted-dark">Belum ada data</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {chartData.classDistribution.map((item, i) => {
                                            const pct = totalGroups > 0 ? (item.groupCount / totalGroups) * 100 : 0;
                                            return (
                                                <div key={item.code}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-brand-muted-dark">{item.code}</span>
                                                        <span className="text-xs text-brand-muted-dark">{item.groupCount} grup · {item.studentCount} mahasiswa</span>
                                                    </div>
                                                    <div className="h-2.5 w-full rounded-full bg-gray-100">
                                                        <div
                                                            className="h-2.5 rounded-full transition-all duration-700"
                                                            style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </LiquidGlassCard>

                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
                            <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-brand-muted-dark" />
                                        <h2 className="text-lg font-semibold font-sans text-brand-dark">
                                            Aktivitas Terbaru
                                        </h2>
                                    </div>
                                </div>

                                {liveActivity.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Activity className="mx-auto h-10 w-10 text-brand-muted-dark opacity-50" />
                                        <p className="mt-3 text-sm text-brand-muted-dark">Belum ada aktivitas</p>
                                        <p className="text-xs text-brand-muted-dark mt-1">Aktivitas akan muncul saat mahasiswa berdiskusi</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {liveActivity.map((activity) => (
                                            <div key={activity.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium"
                                                        style={{ background: 'rgba(136,22,28,0.08)', color: '#88161c' }}
                                                    >
                                                        {activity.senderName?.charAt(0) || '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-brand-dark truncate">{activity.senderName}</p>
                                                        <p className="text-xs text-brand-muted-dark">
                                                            {activity.courseName && `${activity.courseName} · `}
                                                            {activity.groupName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-sm text-brand-muted-dark line-clamp-2">{activity.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </LiquidGlassCard>
                        </motion.div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
