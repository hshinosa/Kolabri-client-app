import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import AppLayout from '@/layouts/app-layout';
import { Course, SharedData } from '@/types';
import lecturer from '@/routes/lecturer';

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

const getQualityColor = (score?: number) => {
    if (score === undefined) return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    if (score >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
};

const getStatusLabel = (score?: number) => {
    if (score === undefined) return 'Belum Ada Data';
    if (score >= 70) return 'Baik';
    if (score >= 50) return 'Perlu Perhatian';
    return 'Butuh Intervensi';
};

// Default values for analytics
const defaultSummary: CourseAnalyticsSummary = {
    totalGroups: 0,
    totalMessages: 0,
    averageQualityScore: null,
    groupsNeedingAttention: 0,
};

export default function CourseAnalytics({ course, analytics }: Props) {
    const { auth } = usePage<SharedData>().props;
    
    // Extract summary and groups with defaults
    const summary = analytics?.summary ?? defaultSummary;
    const groups = analytics?.groups ?? [];
    
    const [liveGroups, setLiveGroups] = useState<GroupAnalytics[]>(groups);
    const [alerts, setAlerts] = useState<Array<{
        type: string;
        groupId: string;
        qualityScore?: number;
        message: string;
        timestamp: string;
    }>>([]);
    const [isConnected, setIsConnected] = useState(false);

    // Update liveGroups when props change
    useEffect(() => {
        setLiveGroups(groups);
    }, [groups]);

    const navItems = useLecturerNav('analytics', { courseId: course.id });

    // Connect to real-time updates
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

        // Listen for lecturer alerts
        socket.on('lecturer_alert', (data) => {
            if (data.courseId === course.id) {
                setAlerts((prev) => [data, ...prev].slice(0, 10));
                
                // Update group quality score in live data
                setLiveGroups((prev) =>
                    prev.map((g) =>
                        g.groupId === data.groupId
                            ? { ...g, qualityScore: data.qualityScore, needsAttention: true }
                            : g
                    )
                );
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [auth.token, course.id]);

    const dismissAlert = (index: number) => {
        setAlerts((prev) => prev.filter((_, i) => i !== index));
    };

    const refreshAnalytics = useCallback(async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/api/analytics/course/${course.id}`, {
                headers: {
                    Authorization: `Bearer ${auth.token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setLiveGroups(data.groups);
            }
        } catch (error) {
            console.error('Failed to refresh analytics:', error);
        }
    }, [course.id, auth.token]);

    return (
        <AppLayout title={`Analytics - ${course.name}`} navItems={navItems}>
            <Head title={`Analytics - ${course.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            Analytics Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {course.code} - {course.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                            isConnected
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'}`} />
                            {isConnected ? 'Live' : 'Offline'}
                        </span>
                        <button
                            onClick={refreshAnalytics}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                </motion.div>

                {/* Alerts */}
                {alerts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                    >
                        {alerts.map((alert, index) => (
                            <motion.div
                                key={`${alert.groupId}-${alert.timestamp}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                            {alert.message}
                                        </p>
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            Skor: {alert.qualityScore?.toFixed(1) || '-'} • {new Date(alert.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismissAlert(index)}
                                    className="rounded p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-800/30"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="card p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                                <svg className="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">Total Grup</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {summary.totalGroups}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="card p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">Total Pesan</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {summary.totalMessages}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="card p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${getQualityColor(summary.averageQualityScore ?? undefined)}`}>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">Rata-rata Kualitas</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {summary.averageQualityScore?.toFixed(1) || '-'}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="card p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                summary.groupsNeedingAttention > 0
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : 'bg-green-100 dark:bg-green-900/30'
                            }`}>
                                <svg className={`h-5 w-5 ${
                                    summary.groupsNeedingAttention > 0
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-green-600 dark:text-green-400'
                                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">Perlu Perhatian</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {summary.groupsNeedingAttention}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Groups Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card overflow-hidden"
                >
                    <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Analisis Grup
                        </h2>
                        <p className="text-sm text-zinc-500">
                            Monitor kualitas diskusi dan engagement setiap grup
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                                        Grup
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                                        Anggota
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                                        Pesan
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                                        Skor Kualitas
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                {liveGroups.map((group) => (
                                    <tr key={group.groupId} className={`${
                                        group.needsAttention ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                                    }`}>
                                        <td className="whitespace-nowrap px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                                    {group.groupName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                                        {group.groupName}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {group.chatSpaceCount} sesi diskusi
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                                            {group.memberCount}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                                            {group.messageCount}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getQualityColor(group.qualityScore)}`}>
                                                {group.qualityScore?.toFixed(1) || '-'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getQualityColor(group.qualityScore)}`}>
                                                {getStatusLabel(group.qualityScore)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-4 text-right">
                                            <Link
                                                href={lecturer.analytics.group.url({ course: course.id, group: group.groupId })}
                                                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                                            >
                                                Detail →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Engagement Distribution */}
                {liveGroups.some((g) => g.engagementDistribution) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="card p-6"
                    >
                        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Distribusi Engagement
                        </h3>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {liveGroups
                                .filter((g) => g.engagementDistribution)
                                .map((group) => (
                                    <div key={group.groupId} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                                        <p className="mb-3 font-medium text-zinc-900 dark:text-zinc-100">
                                            {group.groupName}
                                        </p>
                                        <div className="space-y-2">
                                            {Object.entries(group.engagementDistribution || {}).map(([type, count]) => (
                                                <div key={type} className="flex items-center justify-between">
                                                    <span className={`text-sm ${
                                                        type === 'Cognitive'
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : type === 'Behavioral'
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-purple-600 dark:text-purple-400'
                                                    }`}>
                                                        {type}
                                                    </span>
                                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                        {count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {group.recommendation && (
                                            <p className="mt-3 text-xs text-zinc-500">
                                                💡 {group.recommendation}
                                            </p>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </AppLayout>
    );
}
