import { Head } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Download, Eye, Filter, Search, Shield, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import Breadcrumbs from '@/components/dashboard/Breadcrumbs';
import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { AdminPagination } from '@/components/ui/AdminPagination';
import { BaseModal } from '@/components/ui/BaseModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableRowSkeleton } from '@/components/ui/skeletons';
import { toast } from '@/components/ui/toaster';
import { exportToCSV } from '@/lib/csv-utils';
import AppLayout from '@/layouts/app-layout';

type AuditLogItem = {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    createdAt: string;
    changes?: {
        before?: unknown;
        after?: unknown;
    } | null;
    metadata?: Record<string, unknown> | null;
    user?: {
        id: string;
        name: string;
        email: string;
        role: string;
    } | null;
};

type AuditMeta = {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
};

type AuditFilters = {
    action?: string;
    entityType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
};

type PageProps = {
    logs: AuditLogItem[];
    meta: AuditMeta;
    filters: AuditFilters;
};

const headingStyle = {
    color: 'var(--dm-text-heading)',
} as const;

const inputClassName =
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-brand-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2';

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function stringifyChanges(value: unknown) {
    return JSON.stringify(value ?? {}, null, 2);
}

/** Human-readable labels for `metadata.source` values emitted by core-api audit logs. */
const AUDIT_SOURCE_LABELS: Record<string, string | undefined> = {
    'admin.user.create': 'Menambahkan pengguna',
    'admin.user.update': 'Memperbarui pengguna',
    'admin.user.delete': 'Menghapus pengguna',
    'admin.user.reset-password': 'Mereset kata sandi pengguna',
    'admin.user.bulk-delete': 'Menghapus pengguna secara massal',
    'admin.user.bulk-role-change': 'Mengubah peran pengguna secara massal',
    'admin.user.bulk-import': 'Mengimpor pengguna',
    'admin.course': 'Menambahkan kelas',
    'admin.course.update': 'Memperbarui kelas',
    'admin.course.delete': 'Menghapus kelas',
    'admin.course.clone': 'Mengkloning kelas',
    'admin.course.archive': 'Mengarsipkan kelas',
    'admin.course.restore': 'Memulihkan kelas',
    'admin.course.permanent-delete': 'Menghapus kelas secara permanen',
    'admin.course.bulk-active-state': 'Mengubah status kelas secara massal',
    'admin.ai-provider.create': 'Menambahkan provider AI',
    'admin.ai-provider.update': 'Memperbarui provider AI',
    'admin.ai-provider.delete': 'Menghapus provider AI',
    'admin.ai-provider.activate': 'Mengaktifkan provider AI',
    'middleware-fallback': 'Pencatatan otomatis (middleware)',
    seed: 'Data contoh (seed)',
};

function describeDetails(metadata: AuditLogItem['metadata']) {
    if (!metadata || Object.keys(metadata).length === 0) {
        return '-';
    }

    const { source, ...rest } = metadata;

    if (typeof source !== 'string') {
        return JSON.stringify(metadata);
    }

    // Unknown source → fall back to the raw value instead of hiding it.
    const label = AUDIT_SOURCE_LABELS[source] ?? source;

    return Object.keys(rest).length > 0 ? `${label} · ${JSON.stringify(rest)}` : label;
}

function ChangesModal({
    log,
    onClose,
}: {
    log: AuditLogItem | null;
    onClose: () => void;
}) {
    if (!log) {
        return null;
    }

    return (
        <BaseModal open={Boolean(log)} title="Perubahan Audit" onClose={onClose} size="xl" className="max-h-[90vh] overflow-y-auto rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl">
            <div>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-dark">Perubahan Audit</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {log.action} · {log.entityType} · {log.entityId}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-black/5 hover:text-brand-dark">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div>
                        <p className="text-sm font-semibold text-brand-dark">Sebelum</p>
                        <pre className="mt-2 max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950/95 p-4 text-xs text-slate-100">
                            {stringifyChanges(log.changes?.before)}
                        </pre>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-brand-dark">Sesudah</p>
                        <pre className="mt-2 max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950/95 p-4 text-xs text-slate-100">
                            {stringifyChanges(log.changes?.after)}
                        </pre>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
}

export default function AdminAuditLogPage({ logs, meta, filters }: PageProps) {
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(logs);
    const [auditMeta, setAuditMeta] = useState<AuditMeta>(meta);
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(false);
    const [searchUser, setSearchUser] = useState(filters.userId ?? '');
    const [filterState, setFilterState] = useState<AuditFilters>({
        action: filters.action ?? '',
        entityType: filters.entityType ?? '',
        userId: filters.userId ?? '',
        startDate: filters.startDate ? filters.startDate.slice(0, 10) : '',
        endDate: filters.endDate ? filters.endDate.slice(0, 10) : '',
        limit: filters.limit ?? meta.limit ?? 50,
        offset: filters.offset ?? meta.offset ?? 0,
    });

    useEffect(() => {
        setAuditLogs(logs);
    }, [logs]);

    useEffect(() => {
        setAuditMeta(meta);
    }, [meta]);

    const hasActiveFilters = useMemo(() => {
        return Boolean(filterState.action || filterState.entityType || filterState.userId || filterState.startDate || filterState.endDate);
    }, [filterState]);

    const fetchAuditLogs = async (nextFilters: AuditFilters) => {
        const startTime = Date.now();
        setIsLoading(true);
        setShowSkeleton(true);

        try {
            const response = await axios.get<{ data: AuditLogItem[]; meta: AuditMeta }>('/admin/audit-logs', {
                params: {
                    ...nextFilters,
                    format: 'json',
                },
            });

            setAuditLogs(response.data.data ?? []);
            setAuditMeta(response.data.meta ?? auditMeta);
        } catch {
            toast.error('Gagal memuat log audit.');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 300 - elapsed);
            
            setTimeout(() => {
                setIsLoading(false);
                setShowSkeleton(false);
            }, remaining);
        }
    };

    const applyFilters = () => {
        const nextFilters = {
            ...filterState,
            userId: searchUser.trim() || undefined,
            offset: 0,
        };

        setFilterState(nextFilters);
        void fetchAuditLogs(nextFilters);
    };

    const clearFilters = () => {
        const nextFilters = {
            action: '',
            entityType: '',
            userId: '',
            startDate: '',
            endDate: '',
            limit: 50,
            offset: 0,
        };

        setSearchUser('');
        setFilterState(nextFilters);
        void fetchAuditLogs(nextFilters);
    };

    const handleExportCsv = () => {
        const rows = auditLogs.map((log) => ({
            timestamp: log.createdAt,
            user: log.user?.name ?? '-',
            user_email: log.user?.email ?? '-',
            action: log.action,
            entity_type: log.entityType,
            entity_id: log.entityId,
            details: JSON.stringify(log.metadata ?? {}),
        }));

        exportToCSV(rows, 'audit-log-export.csv');
        toast.success('CSV log audit berhasil diekspor.');
    };

    const currentPage = Math.floor(auditMeta.offset / auditMeta.limit) + 1;
    const totalPages = Math.max(1, Math.ceil(auditMeta.total / auditMeta.limit));

    const handlePageChange = (page: number) => {
        const nextOffset = (page - 1) * auditMeta.limit;

        const nextFilters = {
            ...filterState,
            offset: nextOffset,
        };

        setFilterState(nextFilters);
        void fetchAuditLogs(nextFilters);
    };

    return (
        <AppLayout title="Log Audit">
            <Head title="Admin - Log Audit" />

            <div className="space-y-6">
                <Breadcrumbs items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Log Audit' }]} />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                                    style={{
background: 'var(--dm-accent-bg)',
                                border: '1px solid var(--dm-accent-border-light)',
                                    }}
                                >
                                    <Shield className="h-6 w-6" style={{ color: 'var(--dm-accent)' }} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold" style={headingStyle}>
                                        Log Audit
                                    </h1>
                                    <p className="mt-2 text-brand-muted-dark">
                                        Telusuri setiap aksi admin pada pengguna, kelas, dan pengaturan AI beserta waktu dan riwayat perubahan.
                                    </p>
                                </div>
                            </div>

                            <SecondaryButton onClick={handleExportCsv} className="px-4 py-2 text-sm">
                                <Download className="h-4 w-4" />
                                Ekspor CSV
                            </SecondaryButton>
                        </div>
                    </LiquidGlassCard>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}>
                    <LiquidGlassCard intensity="light" className="space-y-5 p-5 sm:p-6" lightMode={true}>
                        <div className="grid gap-3 lg:grid-cols-4">
                            <div>
                                <label className="text-sm font-medium text-brand-dark">Aksi</label>
                                <select
                                    value={filterState.action}
                                    onChange={(event) => setFilterState((prev) => ({ ...prev, action: event.target.value }))}
                                    className={inputClassName}
                                >
                                    <option value="">Semua aksi</option>
                                    <option value="CREATE">Tambah</option>
                                    <option value="UPDATE">Ubah</option>
                                    <option value="DELETE">Hapus</option>
                                    <option value="ACTIVATE">Aktifkan</option>
                                    <option value="DEACTIVATE">Nonaktifkan</option>
                                    <option value="ROLE_CHANGE">Ubah peran</option>
                                    <option value="CLONE">Kloning</option>
                                    <option value="ARCHIVE">Arsipkan</option>
                                    <option value="RESTORE">Pulihkan</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-brand-dark">Entitas</label>
                                <select
                                    value={filterState.entityType}
                                    onChange={(event) => setFilterState((prev) => ({ ...prev, entityType: event.target.value }))}
                                    className={inputClassName}
                                >
                                    <option value="">Semua entitas</option>
                                    <option value="User">Pengguna</option>
                                    <option value="Course">Kelas</option>
                                    <option value="AiProvider">Provider AI</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-brand-dark">ID Pengguna</label>
                                <div className="relative mt-1.5">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-600" />
                                    <input
                                        type="text"
                                        value={searchUser}
                                        onChange={(event) => setSearchUser(event.target.value)}
                                        placeholder="Cari berdasarkan ID pengguna"
                                        className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-700 shadow-brand-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-brand-dark">Tanggal mulai</label>
                                    <input
                                        type="date"
                                        value={filterState.startDate}
                                        onChange={(event) => setFilterState((prev) => ({ ...prev, startDate: event.target.value }))}
                                        className={inputClassName}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-brand-dark">Tanggal akhir</label>
                                    <input
                                        type="date"
                                        value={filterState.endDate}
                                        onChange={(event) => setFilterState((prev) => ({ ...prev, endDate: event.target.value }))}
                                        className={inputClassName}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                <Filter className="h-3.5 w-3.5" />
                                Filter aktif: {hasActiveFilters ? 'Ya' : 'Tidak'}
                            </div>
                            <PrimaryButton onClick={applyFilters} className="px-4 py-2 text-sm">
                                Terapkan Filter
                            </PrimaryButton>
                            <SecondaryButton onClick={clearFilters} className="px-4 py-2 text-sm">
                                Bersihkan Filter
                            </SecondaryButton>
                        </div>

                        <div className="relative">
                            {/* Desktop table */}
                            <div className="hidden overflow-x-auto rounded-2xl border border-white/70 bg-white/55 md:block">
                                <table className="min-w-full divide-y divide-white/70">
                                <thead className="bg-white/70">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Waktu</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Pengguna</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Aksi</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Entitas</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Detail</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Perubahan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/70">
                                    {showSkeleton ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRowSkeleton key={i} columns={6} />
                                        ))
                                    ) : auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8">
                                                <EmptyState
                                                    icon={Filter}
                                                    title="Tidak ada log ditemukan"
                                                    description="Tidak ada log audit yang sesuai dengan filter yang dipilih"
                                                    action={
                                                        hasActiveFilters && (
                                                            <SecondaryButton onClick={clearFilters}>
                                                                Bersihkan Filter
                                                            </SecondaryButton>
                                                        )
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <tr key={log.id} className="transition-colors duration-150 hover:bg-[var(--dm-surface-hover)]">
                                                <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(log.createdAt)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    <div>
                                                        <p className="font-medium text-brand-dark">{log.user?.name ?? '-'}</p>
                                                        <p className="text-xs text-slate-500">{log.user?.email ?? log.userId}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-brand-primary">{log.action}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    <div>
                                                        <p className="font-medium text-brand-dark">{log.entityType}</p>
                                                        <p className="text-xs text-slate-500">{log.entityId}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    <span className="line-clamp-2 text-xs text-slate-500">{describeDetails(log.metadata)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedLog(log)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-brand-primary/35"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Lihat Perubahan
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="block space-y-4 md:hidden">
                            {auditLogs.length === 0 ? (
                                <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-8">
                                    <EmptyState
                                        icon={Search}
                                        title="Tidak ada data ditemukan"
                                        description="Tidak ada log audit yang sesuai dengan filter yang dipilih."
                                    />
                                </div>
                            ) : (
                                auditLogs.map((log) => (
                                    <LiquidGlassCard key={log.id} intensity="light" className="p-4" lightMode={true}>
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-base font-semibold text-[var(--dm-text)]">{log.action}</p>
                                                    <p className="mt-0.5 text-sm text-[var(--dm-text-secondary)]">{formatDateTime(log.createdAt)}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Pengguna</p>
                                                    <p className="mt-0.5 font-medium text-[var(--dm-text)]">{log.user?.name ?? '-'}</p>
                                                    <p className="text-xs text-[var(--dm-text-secondary)]">{log.user?.email ?? log.userId}</p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Entitas</p>
                                                    <p className="mt-0.5 font-medium text-[var(--dm-text)]">{log.entityType}</p>
                                                    <p className="text-xs text-[var(--dm-text-secondary)]">{log.entityId}</p>
                                                </div>

                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Detail</p>
                                                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--dm-text-secondary)]">{describeDetails(log.metadata)}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {log.changes && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLog(log)}
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-brand-primary/35"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Lihat Perubahan
                                                </button>
                                            )}
                                        </div>
                                    </LiquidGlassCard>
                                ))
                            )}
                        </div>
                    </div>

                        <AdminPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={auditMeta.total}
                            perPage={auditMeta.limit}
                            onPageChange={handlePageChange}
                            isLoading={isLoading}
                            itemLabel="log"
                        />
                    </LiquidGlassCard>
                </motion.div>
            </div>

            <ChangesModal log={selectedLog} onClose={() => setSelectedLog(null)} />
        </AppLayout>
    );
}
