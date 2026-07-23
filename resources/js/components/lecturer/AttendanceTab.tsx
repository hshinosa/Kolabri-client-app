import { AttendanceSession, AttendanceStatus, AttendanceStudentRecord, AttendanceStudentSummary } from '@/types';
import { LiquidGlassCard } from '@/components/Welcome/utils/helpers';
import { CalendarCheck, CheckCircle2, Download, Minus, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/toaster';

const headingStyle = {
    color: '#4A4A4A',
} as const;

const bodyTextClass = 'text-sm text-brand-muted-dark';

const glassPanelStyle = {
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.65)',
} as const;

const statusConfig: Record<Exclude<AttendanceStatus, 'late'>, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
    present: { label: 'Hadir', color: '#166534', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.18)', icon: CheckCircle2 },
    absent: { label: 'Tidak Hadir', color: '#b91c1c', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.18)', icon: XCircle },
    excused: { label: 'Izin', color: '#4b5563', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.18)', icon: Minus },
};

type ViewMode = 'sessions' | 'summary' | 'override';
type GroupTab = 'all' | 'A' | 'B' | 'C';

interface AttendanceTabProps {
    courseId: string;
}

interface GroupedSessions {
    byWeek: Record<string, AttendanceSession[]>;
    weekLabels?: Record<string, string>;
    other: AttendanceSession[];
    running: Array<{
        session_discussion_id: string;
        title: string;
        group_id: string | null;
        week_id: string | null;
        status: string;
    }>;
}

function formatWeekLabel(weekId: string, weekLabels?: Record<string, string>): string {
    return weekLabels?.[weekId] || `Minggu ${weekId}`;
}

export default function AttendanceTab({ courseId }: AttendanceTabProps) {
    const [groupedSessions, setGroupedSessions] = useState<GroupedSessions>({ byWeek: {}, other: [], running: [] });
    const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({});
    const [summary, setSummary] = useState<AttendanceStudentSummary[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('sessions');
    const [loading, setLoading] = useState(true);
    const [overrideSession, setOverrideSession] = useState<string | null>(null);
    const [overrideRecords, setOverrideRecords] = useState<AttendanceStudentRecord[]>([]);
    const [groupTab, setGroupTab] = useState<GroupTab>('all');
    const [summaryWeekFilter, setSummaryWeekFilter] = useState<string>('');
    const [summaryGroupFilter, setSummaryGroupFilter] = useState<string>('');
    const [closeResult, setCloseResult] = useState<{ summary: string; attendanceData?: { students: Array<{ studentName: string; messageCount: number; hotCount: number; status: string }> } } | null>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch(`/lecturer/courses/${courseId}/attendance`, {
                headers: { 'Accept': 'application/json' },
            });
            if (!res.ok) throw new Error('Failed to fetch sessions');
            const data = await res.json();
            setGroupedSessions(data);
            setGroupMembers(data.groupMembers || {});
        } catch (err) {
            toast.error('Gagal memuat data kehadiran');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    const fetchSummary = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (summaryWeekFilter) params.append('week_id', summaryWeekFilter);
            if (summaryGroupFilter) params.append('group_id', summaryGroupFilter);
            const res = await fetch(`/lecturer/courses/${courseId}/attendance/summary?${params}`);
            if (!res.ok) throw new Error('Failed to fetch summary');
            const data = await res.json();
            setSummary(data.summary || []);
        } catch (err) {
            toast.error('Gagal memuat rekapitulasi');
        }
    }, [courseId, summaryWeekFilter, summaryGroupFilter]);

    useEffect(() => {
        if (viewMode === 'sessions') fetchSessions();
        if (viewMode === 'summary') fetchSummary();
    }, [viewMode, fetchSessions, fetchSummary]);

    const startOverride = async (sessionId: string) => {
        try {
            const res = await fetch(`/lecturer/courses/${courseId}/attendance/sessions/${sessionId}`, {
                headers: { 'Accept': 'application/json' },
            });
            if (!res.ok) throw new Error('Failed to fetch session');
            const data = await res.json();
            let records: AttendanceStudentRecord[] = (data.records || []).map((r: AttendanceStudentRecord) => ({
                ...r,
                status: r.status === 'late' ? 'absent' : r.status,
            }));
            // Filter by group tab if selected
            if (groupTab !== 'all' && groupMembers[groupTab]) {
                const memberIds = new Set(groupMembers[groupTab]);
                records = records.filter((r: AttendanceStudentRecord) => memberIds.has(r.student_id));
            }
            setOverrideRecords(records);
            setOverrideSession(sessionId);
            setViewMode('override');
        } catch (err) {
            toast.error('Gagal memuat detail sesi');
        }
    };

    const cycleStatus = (studentId: string) => {
        setOverrideRecords((prev) =>
            prev.map((r) => {
                if (r.student_id === studentId) {
                    const statuses: AttendanceStatus[] = ['present', 'absent', 'excused'];
                    const currentIndex = statuses.indexOf(r.status);
                    const nextIndex = (currentIndex + 1) % statuses.length;
                    return { ...r, status: statuses[nextIndex] };
                }
                return r;
            })
        );
    };

    const saveOverride = async () => {
        if (!overrideSession) return;
        try {
            const overrides = overrideRecords.map((r) => ({
                studentId: r.student_id,
                status: r.status,
                notes: r.notes,
            }));
            const res = await fetch(`/lecturer/courses/${courseId}/attendance/sessions/${overrideSession}/override`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overrides }),
            });
            if (!res.ok) throw new Error('Failed to save override');
            toast.success('Koreksi kehadiran disimpan');
            setViewMode('sessions');
            setOverrideSession(null);
            fetchSessions();
        } catch (err) {
            toast.error('Gagal menyimpan koreksi');
        }
    };

    const deleteSession = async (sessionId: string) => {
        if (!confirm('Hapus sesi kehadiran ini?')) return;
        try {
            const res = await fetch(`/lecturer/courses/${courseId}/attendance/sessions/${sessionId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete session');
            toast.success('Sesi kehadiran dihapus');
            fetchSessions();
        } catch (err) {
            toast.error('Gagal menghapus sesi');
        }
    };

    const closeSession = async (sessionDiscussionId: string) => {
        try {
            const res = await fetch(`/lecturer/courses/${courseId}/attendance/close-single`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionDiscussionId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to close session');
            }
            const data = await res.json();
            const sessionData = data.data || {};
            if (sessionData.summary) {
                setCloseResult({
                    summary: sessionData.summary,
                    attendanceData: sessionData.attendanceData,
                });
            } else {
                toast.success(data.message || 'Sesi ditutup, kehadiran dicatat');
            }
            fetchSessions();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal menutup sesi');
        }
    };

    const bulkCloseRunning = async () => {
        if (!confirm('Tutup semua sesi yang sedang berjalan?')) return;
        try {
            const sessionDiscussionIds = groupedSessions.running.map((s) => s.session_discussion_id);
            const res = await fetch(`/lecturer/courses/${courseId}/attendance/bulk-close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionDiscussionIds }),
            });
            if (!res.ok) throw new Error('Failed to bulk close');
            toast.success('Semua sesi ditutup');
            fetchSessions();
        } catch (err) {
            toast.error('Gagal menutup sesi');
        }
    };

    const handleExport = () => {
        window.open(`/lecturer/courses/${courseId}/attendance/export`, '_blank');
    };

    const formatDate = (v?: string | null) => {
        if (!v) return '-';
        return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getSessionBadge = (session: AttendanceSession) => {
        if (session.auto_generated && (!session.marked_count || session.marked_count === 0)) {
            return <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>Auto ✓</span>;
        }
        if (session.auto_generated && session.marked_count > 0) {
            return <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>Dikoreksi</span>;
        }
        return null;
    };

    const filterSessionsByGroup = (sessions: AttendanceSession[]) => {
        if (groupTab === 'all') return sessions;
        // Pertemuan (no group_label) = class-wide, show in all tabs
        // Auto-attendance (has group_label) = only in matching tab
        return sessions.filter((s) => !s.group_label || s.group_label === groupTab);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 style={headingStyle} className="text-xl font-semibold flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5" />
                    Kehadiran Mahasiswa
                </h3>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg" style={glassPanelStyle}>
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* View Mode Tabs */}
            {viewMode !== 'override' && (
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('sessions')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'sessions' ? 'bg-brand-primary text-white' : 'bg-white/50 text-brand-muted-dark'}`}
                    >
                        Sesi Kehadiran
                    </button>
                    <button
                        onClick={() => setViewMode('summary')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'summary' ? 'bg-brand-primary text-white' : 'bg-white/50 text-brand-muted-dark'}`}
                    >
                        Rekapitulasi
                    </button>
                </div>
            )}

            {/* Sessions View */}
            {viewMode === 'sessions' && (
                <>
                    {/* Group Tabs */}
                    <div className="flex gap-2">
                        {(['all', 'A', 'B', 'C'] as GroupTab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setGroupTab(tab)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition ${groupTab === tab ? 'bg-brand-primary text-white' : 'bg-white/40 text-brand-muted-dark'}`}
                            >
                                {tab === 'all' ? 'Semua' : `Kelompok ${tab}`}
                            </button>
                        ))}
                    </div>

                    {/* Sesi per Minggu */}
                    {Object.keys(groupedSessions.byWeek).length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-base font-semibold" style={headingStyle}>Sesi per Minggu</h4>
                            {Object.entries(groupedSessions.byWeek).map(([weekId, sessions]) => (
                                <div key={weekId} className="space-y-2">
                                    <h5 className="text-sm font-medium text-brand-muted-dark">
                                        {formatWeekLabel(weekId, groupedSessions.weekLabels)}
                                    </h5>
                                    <div className="grid gap-3">
                                        {filterSessionsByGroup(sessions).map((session) => (
                                            <LiquidGlassCard key={session.id} className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h5 className="font-medium" style={headingStyle}>{session.title}</h5>
                                                            {getSessionBadge(session)}
                                                        </div>
                                                        <p className={bodyTextClass}>{formatDate(session.session_date)}</p>
                                                        <p className={bodyTextClass + ' mt-2'}>
                                                            {session.present_count} hadir / {session.total_students} mahasiswa ({session.attendance_rate}%)
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => startOverride(session.id)} className="px-3 py-1.5 text-xs rounded bg-white/50 hover:bg-white/70 transition">
                                                            Lihat Detail
                                                        </button>
                                                        <button onClick={() => deleteSession(session.id)} className="px-3 py-1.5 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 transition">
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            </LiquidGlassCard>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Sesi Lainnya */}
                    {groupedSessions.other.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-base font-semibold" style={headingStyle}>Sesi Lainnya</h4>
                            <div className="grid gap-3">
                                {filterSessionsByGroup(groupedSessions.other).map((session) => (
                                    <LiquidGlassCard key={session.id} className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h5 className="font-medium" style={headingStyle}>{session.title}</h5>
                                                    {getSessionBadge(session)}
                                                </div>
                                                <p className={bodyTextClass}>{formatDate(session.session_date)}</p>
                                                <p className={bodyTextClass + ' mt-2'}>
                                                    {session.present_count} hadir / {session.total_students} mahasiswa ({session.attendance_rate}%)
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => startOverride(session.id)} className="px-3 py-1.5 text-xs rounded bg-white/50 hover:bg-white/70 transition">
                                                    Lihat Detail
                                                </button>
                                                <button onClick={() => deleteSession(session.id)} className="px-3 py-1.5 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 transition">
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </LiquidGlassCard>
                                ))}
                            </div>
                        </div>
                    )}

                    {groupTab !== 'all' && Object.keys(groupedSessions.byWeek).length === 0 && groupedSessions.other.length === 0 && (
                        <div className="text-center py-8">
                            <p className={bodyTextClass}>Belum ada sesi kehadiran untuk Kelompok {groupTab}. Sesi akan muncul otomatis setelah diskusi kelompok ditutup.</p>
                        </div>
                    )}
                    {/* Sedang Berjalan */}
                    {groupedSessions.running.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-base font-semibold" style={headingStyle}>Sedang Berjalan</h4>
                                {groupedSessions.running.length > 1 && (
                                    <button onClick={bulkCloseRunning} className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90 transition">
                                        Tutup Semua Sesi
                                    </button>
                                )}
                            </div>
                            <div className="grid gap-3">
                                {groupedSessions.running.map((session) => (
                                    <LiquidGlassCard key={session.session_discussion_id} className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h5 className="font-medium" style={headingStyle}>{session.title}</h5>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Sedang Berjalan</span>
                                                </div>
                                            </div>
                                            <button onClick={() => closeSession(session.session_discussion_id)} className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90 transition">
                                                Tutup & Catat Kehadiran
                                            </button>
                                        </div>
                                    </LiquidGlassCard>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Override View */}
            {viewMode === 'override' && overrideSession && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-base font-semibold" style={headingStyle}>Koreksi Kehadiran</h4>
                        <button onClick={() => setViewMode('sessions')} className="text-sm text-brand-muted-dark hover:text-brand-primary">
                            ← Kembali
                        </button>
                    </div>
                    <div className="space-y-2">
                        {overrideRecords.map((record) => {
                            const config = statusConfig[record.status === 'late' ? 'absent' : record.status];
                            const Icon = config.icon;
                            return (
                                <LiquidGlassCard key={record.student_id} className="p-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <h5 className="font-medium" style={headingStyle}>{record.student_name}</h5>
                                            <p className={bodyTextClass}>
                                                {record.message_count !== null && `${record.message_count} pesan`}
                                                {record.hot_count !== null && `, ${record.hot_count} HOT`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => cycleStatus(record.student_id)}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition"
                                            style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {config.label}
                                        </button>
                                    </div>
                                </LiquidGlassCard>
                            );
                        })}
                    </div>
                    <button onClick={saveOverride} className="w-full px-4 py-2 rounded-lg bg-brand-primary text-white font-medium hover:opacity-90 transition">
                        Simpan Koreksi
                    </button>
                </div>
            )}

            {/* Summary View */}
            {viewMode === 'summary' && (
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <select value={summaryWeekFilter} onChange={(e) => setSummaryWeekFilter(e.target.value)} className="px-3 py-2 rounded-lg border text-sm">
                            <option value="">Semua Minggu</option>
                            {Object.keys(groupedSessions.byWeek).map((weekId) => (
                                <option key={weekId} value={weekId}>
                                    {formatWeekLabel(weekId, groupedSessions.weekLabels)}
                                </option>
                            ))}
                        </select>
                        <select value={summaryGroupFilter} onChange={(e) => setSummaryGroupFilter(e.target.value)} className="px-3 py-2 rounded-lg border text-sm">
                            <option value="">Semua Kelompok</option>
                            <option value="A">Kelompok A</option>
                            <option value="B">Kelompok B</option>
                            <option value="C">Kelompok C</option>
                        </select>
                    </div>
                    <LiquidGlassCard className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/30">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold" style={headingStyle}>Mahasiswa</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold" style={headingStyle}>Hadir</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold" style={headingStyle}>Izin</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold" style={headingStyle}>Absen</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold" style={headingStyle}>%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/20">
                                    {summary.map((s) => (
                                        <tr key={s.student_id}>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-sm" style={headingStyle}>{s.student_name}</p>
                                                    <p className={bodyTextClass + ' text-xs'}>{s.student_email}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm">{s.present}</td>
                                            <td className="px-4 py-3 text-center text-sm">{s.excused}</td>
                                            <td className="px-4 py-3 text-center text-sm">{s.absent}</td>
                                            <td className="px-4 py-3 text-center text-sm font-semibold">{s.attendance_percentage}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </LiquidGlassCard>
                </div>
            )}

            {/* Summary Modal after close */}
            {closeResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCloseResult(null)}>
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold" style={headingStyle}>Ringkasan Sesi Diskusi</h3>
                            <button onClick={() => setCloseResult(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>
                        <div className="prose prose-sm max-w-none mb-6">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{closeResult.summary}</p>
                        </div>
                        {closeResult.attendanceData && closeResult.attendanceData.students.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold mb-3" style={headingStyle}>Kehadiran Otomatis</h4>
                                <div className="space-y-2">
                                    {closeResult.attendanceData.students.map((s, i) => {
                                        const statusLabel = s.status === 'present' ? 'Hadir' : 'Tidak Hadir';
                                        const statusColor = s.status === 'present' ? 'text-green-600' : 'text-red-600';
                                        return (
                                            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                                <div>
                                                    <span className="text-sm font-medium" style={headingStyle}>{s.studentName}</span>
                                                    <span className="text-xs text-gray-500 ml-2">{s.messageCount} pesan, {s.hotCount} HOT</span>
                                                </div>
                                                <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <button onClick={() => setCloseResult(null)} className="mt-6 w-full px-4 py-2 rounded-lg bg-brand-primary text-white font-medium hover:opacity-90 transition">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
