import { Head, Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import AppLayout from '@/layouts/app-layout';
import { Course, SharedData } from '@/types';
import lecturer from '@/routes/lecturer';

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

const getQualityColor = (score?: number) => {
    if (score === undefined || score === null) return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    if (score >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
};

const getSenderTypeLabel = (type: string) => {
    switch (type) {
        case 'student': return 'Mahasiswa';
        case 'lecturer': return 'Dosen';
        case 'ai': return 'AI';
        case 'bot': return 'Bot';
        case 'system': return 'Sistem';
        default: return type;
    }
};

const getSenderTypeColor = (type: string) => {
    switch (type) {
        case 'ai': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        case 'bot': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'system': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
        case 'lecturer': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        default: return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400';
    }
};

// Engagement type descriptions and example indicators
const engagementTypeInfo: Record<string, { description: string; examples: string[]; colorClass: string; bgClass: string; icon: string }> = {
    cognitive: {
        description: 'Pemikiran kritis, analisis, dan pemahaman konsep',
        examples: ['mengapa', 'bagaimana jika', 'bandingkan', 'analisis', 'evaluasi', 'jelaskan alasan'],
        colorClass: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
        icon: '🧠',
    },
    behavioral: {
        description: 'Partisipasi aktif, berbagi tugas, dan koordinasi',
        examples: ['saya akan', 'mari kita', 'sudah selesai', 'bisa bantu', 'saya coba'],
        colorClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        icon: '⚡',
    },
    emotional: {
        description: 'Dukungan emosional, motivasi, dan empati',
        examples: ['bagus', 'semangat', 'setuju', 'terima kasih', 'jangan khawatir'],
        colorClass: 'text-purple-600 dark:text-purple-400',
        bgClass: 'bg-purple-100 dark:bg-purple-900/30',
        icon: '💜',
    },
};

export default function GroupAnalyticsDetail({ course, group, analytics, members, chatSpaces, recentActivity }: Props) {
    const { auth } = usePage<SharedData>().props;
    
    // Safe defaults
    const safeAnalytics = analytics ?? {};
    const safeMembers = members ?? [];
    const safeChatSpaces = chatSpaces ?? [];
    const safeRecentActivity = recentActivity ?? [];
    const safeQualityBreakdown = safeAnalytics.qualityBreakdown ?? {};
    
    const [liveActivity, setLiveActivity] = useState<RecentActivity[]>(safeRecentActivity);
    const [liveQuality, setLiveQuality] = useState(safeAnalytics.qualityScore);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);

    // Calculate safe percentages
    const hotPercentage = safeQualityBreakdown.hot_percentage ?? safeAnalytics.hotPercentage ?? 0;
    const lexicalVariety = safeQualityBreakdown.lexical_variety ?? 0;
    const participantCount = safeQualityBreakdown.participation ?? safeMembers.length ?? 0;

    const navItems = useLecturerNav('analytics-group', { courseId: course.id, groupId: group.id });

    // Real-time updates
    useEffect(() => {
        if (!auth.token) return;

        const apiUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const socket: Socket = io(apiUrl, {
            auth: { token: auth.token },
            transports: ['websocket', 'polling'],
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

    return (
        <AppLayout title={`${group.name} Analytics`} navItems={navItems}>
            <Head title={`${group.name} Analytics`} />

            <div className="space-y-6">
                {/* Header with breadcrumb */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Link href={lecturer.courses.index.url()} className="hover:text-primary-600">
                            Kelas
                        </Link>
                        <span>/</span>
                        <Link href={lecturer.courses.show.url({ course: course.id })} className="hover:text-primary-600">
                            {course.code}
                        </Link>
                        <span>/</span>
                        <Link href={lecturer.analytics.index.url({ course: course.id })} className="hover:text-primary-600">
                            Analytics
                        </Link>
                        <span>/</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{group.name}</span>
                    </div>
                    <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {group.name} - Analisis Detail
                    </h1>
                </motion.div>

                {/* Quality Score Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-6"
                >
                    <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                        <div className="text-center md:text-left">
                            <h3 className="text-sm font-medium text-zinc-500">Skor Kualitas Diskusi</h3>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className={`text-5xl font-bold ${
                                    (liveQuality ?? 0) >= 70 ? 'text-green-600 dark:text-green-400' :
                                    (liveQuality ?? 0) >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                }`}>
                                    {liveQuality?.toFixed(1) ?? '-'}
                                </span>
                                <span className="text-xl text-zinc-400">/100</span>
                            </div>
                            {safeAnalytics.recommendation && (
                                <p className="mt-3 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                                    💡 {safeAnalytics.recommendation}
                                </p>
                            )}
                        </div>

                        {/* Quality Breakdown - Fixed */}
                        <div className="grid grid-cols-3 gap-6 text-center">
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {hotPercentage > 0 ? `${hotPercentage.toFixed(0)}%` : '0%'}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">HOT Thinking</p>
                                <p className="text-xs text-zinc-400">Higher-Order</p>
                            </div>
                            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {lexicalVariety > 0 ? `${(lexicalVariety * 100).toFixed(0)}%` : '0%'}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">Lexical Variety</p>
                                <p className="text-xs text-zinc-400">Keragaman Kata</p>
                            </div>
                            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {participantCount}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">Participants</p>
                                <p className="text-xs text-zinc-400">Peserta Aktif</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid - Interactive Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Anggota Card - Clickable */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setShowMemberModal(true)}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-500">Anggota</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {safeMembers.length || group.memberCount}
                                </p>
                            </div>
                            <div className="flex -space-x-2">
                                {safeMembers.slice(0, 3).map((member) => (
                                    <div
                                        key={member.id}
                                        className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300 border-2 border-white dark:border-zinc-900"
                                        title={member.name}
                                    >
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                ))}
                                {safeMembers.length > 3 && (
                                    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300 border-2 border-white dark:border-zinc-900">
                                        +{safeMembers.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                        {safeMembers.length > 0 && (
                            <p className="mt-2 text-xs text-primary-600 dark:text-primary-400">
                                Klik untuk lihat semua →
                            </p>
                        )}
                    </motion.div>

                    {/* Sesi Diskusi Card - Clickable */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setShowSessionModal(true)}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-500">Sesi Diskusi</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {safeChatSpaces.length || group.chatSpaceCount}
                                </p>
                            </div>
                            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        {safeChatSpaces.length > 0 && (
                            <p className="mt-2 text-xs text-zinc-500 truncate">
                                Terbaru: {safeChatSpaces[0]?.name || 'Untitled'}
                            </p>
                        )}
                        {safeChatSpaces.length > 0 && (
                            <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">
                                Klik untuk lihat semua →
                            </p>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="card p-5"
                    >
                        <p className="text-sm text-zinc-500">Total Pesan</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {safeAnalytics.local_message_count ?? 0}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="card p-5"
                    >
                        <p className="text-sm text-zinc-500">Status</p>
                        <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${getQualityColor(liveQuality)}`}>
                            {liveQuality === null || liveQuality === undefined 
                                ? 'Belum Ada Data'
                                : liveQuality >= 70 
                                    ? 'Baik' 
                                    : liveQuality >= 50 
                                        ? 'Perlu Perhatian' 
                                        : 'Butuh Intervensi'}
                        </span>
                    </motion.div>
                </div>

                {/* Enhanced Engagement Distribution with Examples */}
                {safeAnalytics.engagementDistribution && Object.keys(safeAnalytics.engagementDistribution).length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="card p-6"
                    >
                        <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Distribusi Engagement (SSRL)
                        </h3>
                        <p className="mb-4 text-sm text-zinc-500">
                            Klasifikasi pesan berdasarkan tipe keterlibatan dalam pembelajaran kolaboratif
                        </p>
                        <div className="grid gap-6 lg:grid-cols-3">
                            {Object.entries(safeAnalytics.engagementDistribution).map(([type, count]) => {
                                const total = Object.values(safeAnalytics.engagementDistribution!).reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? (count / total) * 100 : 0;
                                const typeKey = type.toLowerCase();
                                const info = engagementTypeInfo[typeKey] || engagementTypeInfo.behavioral;
                                
                                return (
                                    <div key={type} className={`p-4 rounded-lg border-2 border-opacity-50 ${info.bgClass}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">{info.icon}</span>
                                            <span className={`text-lg font-semibold capitalize ${info.colorClass}`}>
                                                {type}
                                            </span>
                                        </div>
                                        
                                        {/* Stats */}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                                {count}
                                            </span>
                                            <span className={`text-sm font-medium ${info.colorClass}`}>
                                                {percentage.toFixed(0)}%
                                            </span>
                                        </div>
                                        
                                        {/* Progress bar */}
                                        <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 mb-3">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${
                                                    typeKey === 'cognitive' ? 'bg-blue-500' :
                                                    typeKey === 'behavioral' ? 'bg-green-500' :
                                                    'bg-purple-500'
                                                }`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        
                                        {/* Description */}
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                                            {info.description}
                                        </p>
                                        
                                        {/* Example keywords */}
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-xs text-zinc-500 mr-1">Contoh kata kunci:</span>
                                            {info.examples.slice(0, 4).map((example, i) => (
                                                <span
                                                    key={i}
                                                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${info.bgClass} ${info.colorClass}`}
                                                >
                                                    "{example}"
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Recent Activity Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card p-6"
                >
                    <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Aktivitas Terbaru
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {liveActivity.length === 0 ? (
                            <p className="text-center text-sm text-zinc-500 py-8">
                                Belum ada aktivitas diskusi.
                            </p>
                        ) : (
                            liveActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className={`flex gap-3 rounded-lg p-3 ${
                                        activity.isIntervention
                                            ? 'bg-purple-50 dark:bg-purple-900/20'
                                            : 'bg-zinc-50 dark:bg-zinc-800/50'
                                    }`}
                                >
                                    <div className="flex-shrink-0">
                                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${getSenderTypeColor(activity.senderType)}`}>
                                            {activity.senderName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {activity.senderName}
                                            </span>
                                            <span className={`rounded px-1.5 py-0.5 text-xs ${getSenderTypeColor(activity.senderType)}`}>
                                                {getSenderTypeLabel(activity.senderType)}
                                            </span>
                                            {activity.isIntervention && (
                                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                    Intervensi
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                            {activity.content}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-400">
                                            {new Date(activity.createdAt).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Export Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="flex justify-end"
                >
                    <a
                        href={`/api/analytics/export/${course.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export untuk Process Mining
                    </a>
                </motion.div>
            </div>

            {/* Members Modal */}
            <AnimatePresence>
                {showMemberModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        onClick={() => setShowMemberModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Daftar Anggota ({safeMembers.length})
                                </h3>
                                <button
                                    onClick={() => setShowMemberModal(false)}
                                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                {safeMembers.length === 0 ? (
                                    <p className="text-center text-sm text-zinc-500 py-4">
                                        Belum ada anggota
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {safeMembers.map((member) => (
                                            <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                                <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-medium text-primary-700 dark:text-primary-300">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                        {member.name}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 truncate">
                                                        {member.email}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sessions Modal */}
            <AnimatePresence>
                {showSessionModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        onClick={() => setShowSessionModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Sesi Diskusi ({safeChatSpaces.length})
                                </h3>
                                <button
                                    onClick={() => setShowSessionModal(false)}
                                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                {safeChatSpaces.length === 0 ? (
                                    <p className="text-center text-sm text-zinc-500 py-4">
                                        Belum ada sesi diskusi
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {safeChatSpaces.map((session) => (
                                            <div key={session.id} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                                        {session.name || 'Sesi Tanpa Judul'}
                                                    </p>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                        session.isClosed
                                                            ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    }`}>
                                                        {session.isClosed ? 'Selesai' : 'Aktif'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zinc-500">
                                                    Dibuat: {new Date(session.createdAt).toLocaleString('id-ID')}
                                                </p>
                                                {session.closedAt && (
                                                    <p className="text-xs text-zinc-500">
                                                        Selesai: {new Date(session.closedAt).toLocaleString('id-ID')}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
