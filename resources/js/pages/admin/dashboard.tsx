import { Head } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    BookOpen,
    BrainCircuit,
    Database,
    MessageSquare,
    Settings,
    Shield,
    Sparkles,
    TrendingUp,
    UserPlus,
    Users,
    WandSparkles,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCallback, useEffect, useState } from 'react';

import { LiquidGlassCard, SecondaryButton, OrganicBlob } from '@/components/Welcome/utils/helpers';
import { toast } from '@/components/ui/toaster';
import { connectWebSocket } from '@/lib/websocket';
import AppLayout from '@/layouts/app-layout';
import { SharedData, UserRole } from '@/types';

type DashboardStats = {
    users: {
        total: number;
        byRole: Partial<Record<UserRole, number>>;
        newLast7Days: number;
        activeLast24h: number;
    };
    courses: {
        total: number;
        active: number;
        totalGroups: number;
        totalChatSpaces: number;
    };
    discussions: {
        totalMessages: number;
        messagesToday: number;
        aiInteractions: number;
        avgMessagesPerDiscussion: number;
    };
    engagement: {
        hotThinkingPercentage: number;
        qualityScore: number;
        mostActiveCourse?: {
            id: string;
            name: string;
            messageCount: number;
        } | null;
        mostActiveUser?: {
            id: string;
            name: string;
            messageCount: number;
        } | null;
    };
    userGrowthData: Array<{ date: string; count: number }>;
    messageActivityData: Array<{ date: string; count: number }>;
};

type DashboardActivity = {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    actor?: {
        id: string;
        name: string;
        role: UserRole;
    } | null;
    target?: {
        id: string;
        name: string;
        type: string;
    } | null;
};

type UsageStats = {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    averageLatency: number;
    requestCount: number;
    mostUsedModel: string | null;
    usageByDate: Array<{ date: string; totalTokens: number }>;
};

type PageProps = SharedData & {
    stats?: DashboardStats | null;
    activities?: DashboardActivity[];
    usageStats?: UsageStats | null;
    initialRange?: {
        startDate?: string;
        endDate?: string;
    };
};

type DateRangePreset = '7d' | '30d' | '90d' | 'custom';

type DateRangeState = {
    preset: DateRangePreset;
    startDate: string;
    endDate: string;
};

const DASHBOARD_RANGE_STORAGE_KEY = 'kolabri_admin_dashboard_range';

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const roleBadgeStyles: Record<UserRole, string> = {
    student: 'border border-blue-200 bg-blue-100 text-blue-700',
    lecturer: 'border border-green-200 bg-green-100 text-green-700',
    admin: 'border border-purple-200 bg-purple-100 text-purple-700',
};

function formatNumber(value: number | undefined | null, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat('id-ID', options).format(value ?? 0);
}

function formatRelativeTime(value: string) {
    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
        return '-';
    }

    const diffInSeconds = Math.round((timestamp - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
        ['year', 60 * 60 * 24 * 365],
        ['month', 60 * 60 * 24 * 30],
        ['week', 60 * 60 * 24 * 7],
        ['day', 60 * 60 * 24],
        ['hour', 60 * 60],
        ['minute', 60],
    ];

    for (const [unit, seconds] of units) {
        if (Math.abs(diffInSeconds) >= seconds) {
            return formatter.format(Math.round(diffInSeconds / seconds), unit);
        }
    }

    return formatter.format(diffInSeconds, 'second');
}

function getActivityIcon(type: string) {
    switch (type) {
        case 'user_registered':
            return UserPlus;
        case 'user_deleted':
            return Users;
        case 'course_created':
        case 'course_updated':
        case 'course_deleted':
            return BookOpen;
        case 'group_created':
            return Users;
        case 'discussion_started':
        case 'discussion_ended':
            return MessageSquare;
        case 'ai_provider_changed':
            return WandSparkles;
        default:
            return Sparkles;
    }
}

function getActivityIconStyle(type: string) {
    if (type.startsWith('user_')) {
        return {
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.18)',
            color: '#2563EB',
        };
    }

    if (type.startsWith('course_') || type === 'group_created') {
        return {
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.18)',
            color: '#059669',
        };
    }

    if (type.startsWith('discussion_')) {
        return {
            background: 'rgba(168,85,247,0.12)',
            border: '1px solid rgba(168,85,247,0.18)',
            color: '#9333EA',
        };
    }

    return {
        background: 'rgba(136,22,28,0.08)',
        border: '1px solid rgba(136,22,28,0.12)',
        color: '#88161c',
    };
}

function formatChartDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
    });
}

function ChartSkeleton() {
    return (
        <div className="animate-pulse space-y-3">
            <div className="h-4 w-36 rounded bg-slate-200/60" />
            <div className="h-[220px] rounded-2xl bg-slate-200/50" />
        </div>
    );
}

function toDateInputValue(value: Date) {
    return value.toISOString().slice(0, 10);
}

function createPresetRange(preset: Exclude<DateRangePreset, 'custom'>): DateRangeState {
    const endDate = new Date();
    const startDate = new Date();
    const days = preset === '7d' ? 6 : preset === '30d' ? 29 : 89;
    startDate.setDate(endDate.getDate() - days);

    return {
        preset,
        startDate: toDateInputValue(startDate),
        endDate: toDateInputValue(endDate),
    };
}

function normalizeRangeState(value?: Partial<DateRangeState> | null): DateRangeState {
    const fallback = createPresetRange('7d');

    if (!value?.startDate || !value?.endDate) {
        return fallback;
    }

    return {
        preset: value.preset ?? 'custom',
        startDate: value.startDate,
        endDate: value.endDate,
    };
}

function getPresetLabel(preset: DateRangePreset) {
    switch (preset) {
        case '7d':
            return 'Last 7 days';
        case '30d':
            return 'Last 30 days';
        case '90d':
            return 'Last 90 days';
        case 'custom':
            return 'Custom range';
        default:
            return 'Last 7 days';
    }
}

function DateRangeModal({
    open,
    value,
    onChange,
    onClose,
    onApply,
}: {
    open: boolean;
    value: DateRangeState;
    onChange: (next: DateRangeState) => void;
    onClose: () => void;
    onApply: () => void;
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-[#4A4A4A]">Custom date range</h3>
                        <p className="mt-1 text-sm text-[#6B7280]">Select a start and end date for dashboard stats, charts, and AI usage.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-black/5 hover:text-[#4A4A4A]">
                        ×
                    </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-[#4A4A4A]">Start date</label>
                        <input
                            type="date"
                            value={value.startDate}
                            onChange={(event) => onChange({ ...value, preset: 'custom', startDate: event.target.value })}
                            className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#88161c] focus:outline-none focus:ring focus:ring-[#88161c]/20"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[#4A4A4A]">End date</label>
                        <input
                            type="date"
                            value={value.endDate}
                            onChange={(event) => onChange({ ...value, preset: 'custom', endDate: event.target.value })}
                            className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#88161c] focus:outline-none focus:ring focus:ring-[#88161c]/20"
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <SecondaryButton onClick={onClose} className="flex-1 justify-center px-4 py-2.5 text-sm">
                        Cancel
                    </SecondaryButton>
                    <button
                        type="button"
                        onClick={onApply}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-[#88161c] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                    >
                        Apply range
                    </button>
                </div>
            </div>
        </div>
    );
}

function UserGrowthChart({ data, isLoading }: { data: Array<{ label: string; count: number }>; isLoading: boolean }) {
    if (isLoading) {
        return <ChartSkeleton />;
    }

    if (data.length === 0) {
        return (
            <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/30 text-sm text-[#6B7280]">
                No data available
            </div>
        );
    }

    return (
        <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148,163,184,0.5)' }}
                        tickLine={{ stroke: 'rgba(148,163,184,0.5)' }}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148,163,184,0.5)' }}
                        tickLine={{ stroke: 'rgba(148,163,184,0.5)' }}
                    />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={true}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function MessageActivityChart({ data, isLoading }: { data: Array<{ label: string; count: number }>; isLoading: boolean }) {
    if (isLoading) {
        return <ChartSkeleton />;
    }

    if (data.length === 0) {
        return (
            <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/30 text-sm text-[#6B7280]">
                No data available
            </div>
        );
    }

    return (
        <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148,163,184,0.5)' }}
                        tickLine={{ stroke: 'rgba(148,163,184,0.5)' }}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148,163,184,0.5)' }}
                        tickLine={{ stroke: 'rgba(148,163,184,0.5)' }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    accent,
    helper,
    subtext,
}: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    accent: {
        bg: string;
        border: string;
        text: string;
    };
    helper: string;
    subtext: string;
}) {
    return (
        <LiquidGlassCard intensity="light" className="h-full p-5" lightMode={true}>
            <div className="flex h-full flex-col justify-between gap-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-[#6B7280]">{title}</p>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight" style={headingStyle}>
                            {value}
                        </h2>
                    </div>
                    <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{ background: accent.bg, border: accent.border }}
                    >
                        <Icon className="h-5 w-5" style={{ color: accent.text }} />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium" style={{ color: accent.text }}>
                        {helper}
                    </p>
                    <p className="text-sm leading-6 text-[#6B7280]">{subtext}</p>
                </div>
            </div>
        </LiquidGlassCard>
    );
}

export default function AdminDashboardPage({ auth, stats, activities = [], usageStats, initialRange }: PageProps) {
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(stats ?? null);
    const [dashboardActivities, setDashboardActivities] = useState<DashboardActivity[]>(activities);
    const [dashboardUsageStats, setDashboardUsageStats] = useState<UsageStats | null>(usageStats ?? null);
    const [isStatsLoading, setIsStatsLoading] = useState(typeof stats === 'undefined');
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState<DateRangeState>(() => {
        if (typeof window === 'undefined') {
            return normalizeRangeState({
                preset: '7d',
                startDate: initialRange?.startDate,
                endDate: initialRange?.endDate,
            });
        }

        const savedRange = localStorage.getItem(DASHBOARD_RANGE_STORAGE_KEY);

        if (savedRange) {
            try {
                return normalizeRangeState(JSON.parse(savedRange) as Partial<DateRangeState>);
            } catch {
                return normalizeRangeState({
                    preset: '7d',
                    startDate: initialRange?.startDate,
                    endDate: initialRange?.endDate,
                });
            }
        }

        return normalizeRangeState({
            preset: initialRange?.startDate && initialRange?.endDate ? 'custom' : '7d',
            startDate: initialRange?.startDate,
            endDate: initialRange?.endDate,
        });
    });

    useEffect(() => {
        setDashboardStats(stats ?? null);
    }, [stats]);

    useEffect(() => {
        setDashboardActivities(activities);
    }, [activities]);

    useEffect(() => {
        setDashboardUsageStats(usageStats ?? null);
    }, [usageStats]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(DASHBOARD_RANGE_STORAGE_KEY, JSON.stringify(dateRange));
        }
    }, [dateRange]);

    const fetchDashboardData = useCallback(async (range: DateRangeState) => {
        setIsStatsLoading(true);

        try {
            const response = await axios.get<{ data: { stats: DashboardStats; activities: DashboardActivity[]; usageStats: UsageStats | null } }>('/admin/dashboard', {
                headers: {
                    Accept: 'application/json',
                },
                params: {
                    startDate: new Date(`${range.startDate}T00:00:00`).toISOString(),
                    endDate: new Date(`${range.endDate}T23:59:59`).toISOString(),
                },
            });

            setDashboardStats(response.data.data.stats ?? null);
            setDashboardActivities(response.data.data.activities ?? []);
            setDashboardUsageStats(response.data.data.usageStats ?? null);
        } catch {
            toast.error('Failed to refresh dashboard data.');
        } finally {
            setIsStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchDashboardData(dateRange);
    }, [dateRange, fetchDashboardData]);

    useEffect(() => {
        let socket: WebSocket | null = null;

        void connectWebSocket({
            onOpen: () => setIsSocketConnected(true),
            onClose: () => setIsSocketConnected(false),
            onError: () => setIsSocketConnected(false),
            onMessage: (message) => {
                if (message.event === 'dashboard:stats:update') {
                    void fetchDashboardData(dateRange);
                }
            },
        }).then((instance) => {
            socket = instance;
        }).catch(() => {
            setIsSocketConnected(false);
        });

        return () => {
            socket?.close();
        };
    }, [dateRange, fetchDashboardData]);

    const safeStats: DashboardStats = dashboardStats ?? {
        users: {
            total: 0,
            byRole: { student: 0, lecturer: 0, admin: 0 },
            newLast7Days: 0,
            activeLast24h: 0,
        },
        courses: {
            total: 0,
            active: 0,
            totalGroups: 0,
            totalChatSpaces: 0,
        },
        discussions: {
            totalMessages: 0,
            messagesToday: 0,
            aiInteractions: 0,
            avgMessagesPerDiscussion: 0,
        },
        engagement: {
            hotThinkingPercentage: 0,
            qualityScore: 0,
            mostActiveCourse: null,
            mostActiveUser: null,
        },
        userGrowthData: [],
        messageActivityData: [],
    };

    const userGrowthData = (Array.isArray(safeStats.userGrowthData) ? safeStats.userGrowthData : []).map((item) => ({
        ...item,
        label: formatChartDate(item.date),
    }));
    const messageActivityData = (Array.isArray(safeStats.messageActivityData) ? safeStats.messageActivityData : []).map((item) => ({
        ...item,
        label: formatChartDate(item.date),
    }));
    const safeUsageStats: UsageStats = dashboardUsageStats ?? {
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        averageLatency: 0,
        requestCount: 0,
        mostUsedModel: null,
        usageByDate: [],
    };
    const usageChartData = (Array.isArray(safeUsageStats.usageByDate) ? safeUsageStats.usageByDate : []).map((item) => ({
        ...item,
        label: formatChartDate(item.date),
        count: item.totalTokens,
    }));

    const statsCards = [
        {
            title: 'Total Users',
            value: formatNumber(safeStats.users.total),
            icon: Users,
            accent: {
                bg: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.18)',
                text: '#2563EB',
            },
            helper: `${formatNumber(safeStats.users.activeLast24h)} active in the last 24h`,
            subtext: `${formatNumber(safeStats.users.byRole.student)} students • ${formatNumber(safeStats.users.byRole.lecturer)} lecturers • ${formatNumber(safeStats.users.byRole.admin)} admins • ${formatNumber(safeStats.users.newLast7Days)} new this week`,
        },
        {
            title: 'Active Courses',
            value: formatNumber(safeStats.courses.active),
            icon: BookOpen,
            accent: {
                bg: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.18)',
                text: '#059669',
            },
            helper: `${formatNumber(safeStats.courses.total)} total courses tracked`,
            subtext: `${formatNumber(safeStats.courses.totalGroups)} groups and ${formatNumber(safeStats.courses.totalChatSpaces)} chat spaces are supporting discussion activity`,
        },
        {
            title: 'Messages Today',
            value: formatNumber(safeStats.discussions.messagesToday),
            icon: MessageSquare,
            accent: {
                bg: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.18)',
                text: '#9333EA',
            },
            helper: `${formatNumber(safeStats.discussions.aiInteractions)} AI-assisted interactions`,
            subtext: `Average ${formatNumber(safeStats.discussions.avgMessagesPerDiscussion, {
                maximumFractionDigits: 1,
                minimumFractionDigits: 1,
            })} messages per discussion across ${formatNumber(safeStats.discussions.totalMessages)} total messages`,
        },
        {
            title: 'Quality Score',
            value: formatNumber(safeStats.engagement.qualityScore, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            }),
            icon: TrendingUp,
            accent: {
                bg: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.18)',
                text: '#D97706',
            },
            helper: `${formatNumber(safeStats.engagement.hotThinkingPercentage, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            })}% HOT thinking coverage`,
            subtext: safeStats.engagement.mostActiveCourse
                ? `Most active course: ${safeStats.engagement.mostActiveCourse.name} with ${formatNumber(safeStats.engagement.mostActiveCourse.messageCount)} messages`
                : 'Most active course data will appear here once discussion activity is available.',
        },
        {
            title: 'AI Usage',
            value: formatNumber(safeUsageStats.totalTokens),
            icon: WandSparkles,
            accent: {
                bg: 'rgba(14,165,233,0.12)',
                border: '1px solid rgba(14,165,233,0.18)',
                text: '#0284C7',
            },
            helper: `Estimated $${safeUsageStats.estimatedCost.toFixed(4)} this month`,
            subtext: `${safeUsageStats.mostUsedModel ?? 'No model yet'} • avg ${formatNumber(safeUsageStats.averageLatency)} ms • ${formatNumber(safeUsageStats.requestCount)} requests`,
        },
    ];

    return (
        <AppLayout title="Dashboard">
            <Head title="Admin Dashboard" />

            <div className="relative space-y-6">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={300} />
                <OrganicBlob className="top-40 -right-20" delay={-5} color="rgba(136, 22, 28, 0.03)" size={250} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-3xl">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex h-14 w-14 items-center justify-center rounded-2xl"
                                        style={{
                                            background: 'rgba(136,22,28,0.08)',
                                            border: '1px solid rgba(136,22,28,0.12)',
                                        }}
                                    >
                                        <Shield className="h-7 w-7" style={{ color: '#88161c' }} />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold" style={headingStyle}>
                                            Welcome back, {auth.user?.name}!
                                        </h1>
                                         <p className="mt-1 text-sm text-[#6B7280]">Platform overview for administration, learning activity, and AI governance.</p>
                                         <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-600">
                                             <span className={`h-2.5 w-2.5 rounded-full ${isSocketConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                             {isSocketConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
                                         </div>
                                     </div>
                                 </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-2xl border border-white/60 bg-white/40 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Most Active Course</p>
                                        <p className="mt-2 text-sm font-semibold text-[#4A4A4A]">
                                            {safeStats.engagement.mostActiveCourse?.name ?? 'No data yet'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/60 bg-white/40 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Most Active User</p>
                                        <p className="mt-2 text-sm font-semibold text-[#4A4A4A]">
                                            {safeStats.engagement.mostActiveUser?.name ?? 'No data yet'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/60 bg-white/40 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Course Messages</p>
                                        <p className="mt-2 text-sm font-semibold text-[#4A4A4A]">
                                            {safeStats.engagement.mostActiveCourse
                                                ? `${formatNumber(safeStats.engagement.mostActiveCourse.messageCount)} messages`
                                                : 'No messages yet'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/60 bg-white/40 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">User Messages</p>
                                        <p className="mt-2 text-sm font-semibold text-[#4A4A4A]">
                                            {safeStats.engagement.mostActiveUser
                                                ? `${formatNumber(safeStats.engagement.mostActiveUser.messageCount)} messages`
                                                : 'No messages yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px] lg:grid-cols-1">
                                <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Date Range</p>
                                            <p className="mt-2 text-sm font-semibold text-[#4A4A4A]">{getPresetLabel(dateRange.preset)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsRangeModalOpen(true)}
                                            className="rounded-full border border-[#88161c]/15 bg-[#88161c]/8 px-3 py-2 text-xs font-medium text-[#88161c] transition hover:bg-[#88161c]/12"
                                        >
                                            Change range
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">
                                        {dateRange.startDate} → {dateRange.endDate}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {(['7d', '30d', '90d'] as const).map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setDateRange(createPresetRange(preset))}
                                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${dateRange.preset === preset ? 'bg-[#88161c] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-[#88161c]/30'}`}
                                            >
                                                {getPresetLabel(preset)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <SecondaryButton href="/admin/users" lightMode={true} className="w-full justify-between rounded-2xl px-5 py-4">
                                    <span className="inline-flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        User Management
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </SecondaryButton>
                                <SecondaryButton href="/admin/master-data" lightMode={true} className="w-full justify-between rounded-2xl px-5 py-4">
                                    <span className="inline-flex items-center gap-2">
                                        <Database className="h-4 w-4" />
                                        Master Data
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </SecondaryButton>
                                <SecondaryButton href="/admin/ai-settings" lightMode={true} className="w-full justify-between rounded-2xl px-5 py-4">
                                    <span className="inline-flex items-center gap-2">
                                        <Settings className="h-4 w-4" />
                                        AI Settings
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </SecondaryButton>
                                <SecondaryButton href="/admin/audit-log" lightMode={true} className="w-full justify-between rounded-2xl px-5 py-4">
                                    <span className="inline-flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Audit Log
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </SecondaryButton>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </motion.div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {statsCards.map((card, index) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 * (index + 1), duration: 0.45 }}
                        >
                            <StatCard {...card} />
                        </motion.div>
                    ))}
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14, duration: 0.45 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                                <h3 className="text-lg font-semibold" style={headingStyle}>
                                    User Growth ({getPresetLabel(dateRange.preset)})
                                </h3>
                            <p className="mt-2 text-sm text-[#6B7280]">New users per day.</p>
                            <div className="mt-4">
                                <UserGrowthChart data={userGrowthData} isLoading={isStatsLoading} />
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.45 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                                <h3 className="text-lg font-semibold" style={headingStyle}>
                                    Message Activity ({getPresetLabel(dateRange.preset)})
                                </h3>
                            <p className="mt-2 text-sm text-[#6B7280]">Messages per day.</p>
                            <div className="mt-4">
                                <MessageActivityChart data={messageActivityData} isLoading={isStatsLoading} />
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.45 }}
                >
                    <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                        <h3 className="text-lg font-semibold" style={headingStyle}>
                            AI Token Usage (Last 30 Days)
                        </h3>
                        <p className="mt-2 text-sm text-[#6B7280]">Monthly AI usage trend across all tracked requests.</p>
                        <div className="mt-4">
                            <MessageActivityChart data={usageChartData} isLoading={isStatsLoading} />
                        </div>
                    </LiquidGlassCard>
                </motion.div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.45 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#88161c]/10 bg-[#88161c]/5 px-3 py-1 text-xs font-medium text-[#88161c]">
                                        <BrainCircuit className="h-3.5 w-3.5" />
                                        Engagement snapshot
                                    </div>
                                    <h2 className="mt-4 text-xl font-semibold" style={headingStyle}>
                                        Learning quality highlights
                                    </h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
                                        This section summarizes the signals behind the scorecards so admins can quickly understand whether activity is growing in a healthy way.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <div className="rounded-3xl border border-white/60 bg-white/35 p-5">
                                    <p className="text-sm font-medium text-[#6B7280]">AI-assisted discussions</p>
                                    <p className="mt-3 text-3xl font-bold" style={headingStyle}>
                                        {formatNumber(safeStats.discussions.aiInteractions)}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                                        AI responses are contributing to classroom discussions and can be used as a quick signal for adoption of guided collaboration.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-white/60 bg-white/35 p-5">
                                    <p className="text-sm font-medium text-[#6B7280]">HOT thinking rate</p>
                                    <p className="mt-3 text-3xl font-bold" style={headingStyle}>
                                        {formatNumber(safeStats.engagement.hotThinkingPercentage, {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                        })}
                                        %
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                                        Higher-order thinking coverage helps show whether discussions are moving beyond simple exchange into deeper analysis.
                                    </p>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.24, duration: 0.45 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold" style={headingStyle}>
                                        Recent activity
                                    </h2>
                                    <p className="mt-2 text-sm text-[#6B7280]">Latest 10 events from users, courses, discussions, and AI configuration.</p>
                                </div>
                                <a href="/admin/audit-log" className="text-sm font-medium text-[#88161c] transition hover:opacity-80">
                                    View Audit Log
                                </a>
                            </div>

                            <div className="mt-6 space-y-4">
                                {dashboardActivities.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/30 px-5 py-8 text-center text-sm text-[#6B7280]">
                                        Activity feed is empty right now. New admin and learning events will appear here.
                                    </div>
                                ) : (
                                    dashboardActivities.map((activity) => {
                                        const Icon = getActivityIcon(activity.type);
                                        const iconStyle = getActivityIconStyle(activity.type);

                                        return (
                                            <div
                                                key={activity.id}
                                                className="rounded-3xl border border-white/60 bg-white/35 p-4 transition hover:bg-white/45"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div
                                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                                                        style={{
                                                            background: iconStyle.background,
                                                            border: iconStyle.border,
                                                        }}
                                                    >
                                                        <Icon className="h-5 w-5" style={{ color: iconStyle.color }} />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-semibold text-[#4A4A4A]">
                                                                {activity.actor?.name ?? 'System'}
                                                            </p>
                                                            {activity.actor?.role ? (
                                                                <span
                                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${roleBadgeStyles[activity.actor.role]}`}
                                                                >
                                                                    {activity.actor.role}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6 text-[#6B7280]">{activity.description}</p>
                                                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">
                                                            {formatRelativeTime(activity.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </div>

            <DateRangeModal
                open={isRangeModalOpen}
                value={dateRange}
                onChange={setDateRange}
                onClose={() => setIsRangeModalOpen(false)}
                onApply={() => {
                    if (dateRange.startDate > dateRange.endDate) {
                        toast.error('Start date must be before end date.');
                        return;
                    }

                    setDateRange((currentRange) => ({
                        ...currentRange,
                        preset: 'custom',
                    }));
                    setIsRangeModalOpen(false);
                }}
            />
        </AppLayout>
    );
}
