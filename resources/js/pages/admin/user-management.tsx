import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Download,
    Filter,
    FileSpreadsheet,
    Import,
    Loader2,
    MoreVertical,
    Plus,
    RefreshCcw,
    Search,
    Trash2,
    UserCheck,
    UserCog,
    UserPen,
    UserX,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { AdminPagination } from '@/components/ui/AdminPagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormModal } from '@/components/ui/FormModal';
import { InputError } from '@/components/ui/input-error';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { TableRowSkeleton } from '@/components/ui/skeletons';
import { toast } from '@/components/ui/toaster';
import { exportToCSV, parseCSV, validateCSVColumns, type CsvRecord } from '@/lib/csv-utils';
import { connectWebSocket, type AdminSocketHandle } from '@/lib/websocket';
import Breadcrumbs from '@/components/dashboard/Breadcrumbs';
import AppLayout from '@/layouts/app-layout';
import { User, UserRole } from '@/types';

type FilterRole = UserRole | 'all';

type ManagedUser = User & {
    isActive?: boolean;
};

interface PaginationData {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface FilterData {
    role?: UserRole;
    search?: string;
}

interface PageProps {
    users: ManagedUser[];
    pagination: PaginationData;
    filters: FilterData;
}

interface ApiErrorResponse {
    error?: {
        message?: string;
        details?: string;
    };
    message?: string;
    errors?: Record<string, string | string[]>;
}

const USER_IMPORT_REQUIRED_COLUMNS = ['name', 'email', 'role'];
const USER_SAMPLE_ROWS = [
    { name: 'Jane Doe', email: 'jane@example.com', role: 'student' },
    { name: 'John Lecturer', email: 'john@example.com', role: 'lecturer' },
];

const roleConfig: Record<UserRole, { label: string; className: string }> = {
    student: {
        label: 'Mahasiswa',
        className: 'border border-blue-200 bg-blue-100 text-blue-700',
    },
    lecturer: {
        label: 'Dosen',
        className: 'border border-green-200 bg-green-100 text-green-700',
    },
    admin: {
        label: 'Admin',
        className: 'border border-purple-200 bg-purple-100 text-purple-700',
    },
};

const headingStyle = {
    color: 'var(--dm-text-heading)',
    
} as const;

const inputClassName =
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-brand-sm transition focus:border-brand-primary focus:outline-none focus:ring focus-visible:ring-brand-primary/20';

const buttonSpinner = <Loader2 className="h-4 w-4 animate-spin" />;

function formatDate(date?: string | null) {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function extractFirstError(errors: Record<string, string> | undefined, fallback: string) {
    if (!errors) return fallback;

    const first = Object.values(errors)[0];
    return typeof first === 'string' && first.length > 0 ? first : fallback;
}

function extractAxiosErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const payload = error.response?.data;

        if (payload?.error?.message) return payload.error.message;
        if (payload?.message) return payload.message;

        if (payload?.errors) {
            const firstError = Object.values(payload.errors)[0];

            if (typeof firstError === 'string') return firstError;
            if (Array.isArray(firstError) && firstError.length > 0) return firstError[0];
        }
    }

    return fallback;
}

function normalizeUserRole(value: string): UserRole | null {
    if (value === 'student' || value === 'lecturer' || value === 'admin') {
        return value;
    }

    return null;
}

function UserCard({
    user,
    selected,
    onToggleSelect,
    onEdit,
    onResetPassword,
    onDelete,
    onToggleStatus,
}: {
    user: ManagedUser;
    selected: boolean;
    onToggleSelect: (userId: string) => void;
    onEdit: (user: ManagedUser) => void;
    onResetPassword: (user: ManagedUser) => void;
    onDelete: (user: ManagedUser) => void;
    onToggleStatus: (user: ManagedUser) => void;
}) {
    const isUserActive = user.isActive !== false;
    const statusBadgeClassName = isUserActive
        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
        : 'border-amber-200 bg-amber-100 text-amber-700';
    const statusLabel = isUserActive ? 'Aktif' : 'Nonaktif';

    return (
        <LiquidGlassCard intensity="light" className="p-4 transition-shadow duration-200" lightMode={true}>
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <label className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                            <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => onToggleSelect(user.id)}
                                className="h-4 w-4 rounded border-slate-300 text-brand-primary focus-visible:ring-brand-primary/30"
                            />
                            Pilih pengguna
                        </label>
                        <p className="text-base font-semibold text-[var(--dm-text)]">{user.name}</p>
                        <p className="mt-0.5 truncate text-sm text-[var(--dm-text-secondary)]">{user.email}</p>
                    </div>
                    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClassName}`}>
                        {statusLabel}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleConfig[user.role].className}`}>
                        {roleConfig[user.role].label}
                    </span>
                    <span className="text-xs text-[var(--dm-text-muted)]">Dibuat: {formatDate(user.createdAt)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(user)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-brand-primary/35"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onResetPassword(user)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-brand-primary/35"
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleStatus(user)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-brand-primary/35"
                    >
                        {isUserActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(user)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs text-rose-600 transition hover:bg-rose-100"
                    >
                        Hapus
                    </button>
                </div>
            </div>
        </LiquidGlassCard>
    );
}

export default function AdminUserManagementPage({ users, pagination, filters }: PageProps) {
    const [userList, setUserList] = useState<ManagedUser[]>(users);
    const [paginationState, setPaginationState] = useState<PaginationData>(pagination);
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const [roleFilter, setRoleFilter] = useState<FilterRole>(filters.role ?? 'all');
    const [limit, setLimit] = useState<number>(pagination.limit);
    const [isFetching, setIsFetching] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(false);
    const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [bulkRole, setBulkRole] = useState<UserRole>('student');
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<CsvRecord[]>([]);
    const [importValidationError, setImportValidationError] = useState<string | null>(null);
    const [importProcessing, setImportProcessing] = useState(false);

    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        role: 'student' as UserRole,
    });

    const editForm = useForm({
        name: '',
        email: '',
        role: 'student' as UserRole,
    });

    const resetPasswordForm = useForm({
        password: '',
    });

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchInput.trim().length > 0) count += 1;
        if (roleFilter !== 'all') count += 1;
        return count;
    }, [roleFilter, searchInput]);

    const { start, end, total } = useMemo(() => {
        const s = paginationState.total === 0 ? 0 : (paginationState.page - 1) * paginationState.limit + 1;
        const e = Math.min(paginationState.page * paginationState.limit, paginationState.total);
        return { start: s, end: e, total: paginationState.total };
    }, [paginationState.page, paginationState.limit, paginationState.total]);

    useEffect(() => {
        setUserList(users);
    }, [users]);

    useEffect(() => {
        setPaginationState(pagination);
    }, [pagination]);

    useEffect(() => {
        setSearchInput(filters.search ?? '');
        setRoleFilter(filters.role ?? 'all');
        setLimit(pagination.limit);
    }, [filters.role, filters.search, pagination.limit]);

    const fetchUsersJson = useCallback(async () => {
        try {
            const response = await axios.get<{
                data: {
                    users: ManagedUser[];
                    pagination: PaginationData;
                    filters: FilterData;
                };
            }>('/admin/users', {
                headers: {
                    Accept: 'application/json',
                },
                params: {
                    page: paginationState.page,
                    limit,
                    role: roleFilter !== 'all' ? roleFilter : undefined,
                    search: searchInput.trim() || undefined,
                },
            });

            setUserList(response.data.data.users ?? []);
            setPaginationState((currentPagination) => response.data.data.pagination ?? currentPagination);
        } catch {
            toast.error('Gagal memuat ulang daftar pengguna.');
        }
    }, [limit, paginationState.page, roleFilter, searchInput]);

    useEffect(() => {
        let socket: AdminSocketHandle | null = null;

        void connectWebSocket({
            onMessage: (message) => {
                if (message.event === 'users:created' || message.event === 'users:updated' || message.event === 'users:deleted') {
                    const actorName = (message.data as { actor?: { name?: string } })?.actor?.name;

                    if (message.event === 'users:created' && actorName) {
                        toast.success(`Pengguna baru ditambahkan oleh ${actorName}`);
                    }

                    void fetchUsersJson();
                }
            },
        }).then((instance) => {
            socket = instance;
        }).catch(() => {
            // ignore websocket init failures here
        });

        return () => {
            socket?.close();
        };
    }, [fetchUsersJson]);

    useEffect(() => {
        setSelectedUserIds((currentSelection) => {
            const nextSelection = new Set(users.filter((user) => currentSelection.has(user.id)).map((user) => user.id));

            if (nextSelection.size === currentSelection.size) {
                return currentSelection;
            }

            return nextSelection;
        });
    }, [users]);

    const selectedUsersCount = selectedUserIds.size;
    const allUsersSelected = users.length > 0 && users.every((user) => selectedUserIds.has(user.id));

    const requestUsers = useCallback(({
        page = paginationState.page,
        limitValue = limit,
        role = roleFilter,
        search = searchInput.trim(),
    }: {
        page?: number;
        limitValue?: number;
        role?: FilterRole;
        search?: string;
    } = {}) => {
        const startTime = Date.now();
        setIsFetching(true);
        setShowSkeleton(true);

        router.get(
            '/admin/users',
            {
                page,
                limit: limitValue,
                role: role !== 'all' ? role : undefined,
                search: search || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => {
                    const elapsed = Date.now() - startTime;
                    const remaining = Math.max(0, 300 - elapsed);
                    
                    setTimeout(() => {
                        setIsFetching(false);
                        setShowSkeleton(false);
                    }, remaining);
                },
            },
        );
    }, [limit, paginationState.page, roleFilter, searchInput]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const normalizedServerSearch = (filters.search ?? '').trim();
            const normalizedInputSearch = searchInput.trim();

            if (normalizedServerSearch === normalizedInputSearch) {
                return;
            }

            requestUsers({ page: 1, search: normalizedInputSearch || undefined });
        }, 500);

        return () => clearTimeout(timeout);
    }, [filters.search, requestUsers, searchInput]);

    const handleRoleFilterChange = (nextRole: FilterRole) => {
        setRoleFilter(nextRole);
        requestUsers({ page: 1, role: nextRole });
    };

    const handleLimitChange = (nextLimit: number) => {
        setLimit(nextLimit);
        requestUsers({ page: 1, limitValue: nextLimit });
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setRoleFilter('all');
        setLimit(10);
        requestUsers({ page: 1, role: 'all', search: '', limitValue: 10 });
    };

    const openEdit = (user: User) => {
        setSelectedUser(user);
        editForm.setData({
            name: user.name,
            email: user.email,
            role: user.role,
        });
        editForm.clearErrors();
        setShowEditModal(true);
    };

    const openDelete = (user: User) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const openResetPassword = (user: User) => {
        setSelectedUser(user);
        resetPasswordForm.reset();
        resetPasswordForm.clearErrors();
        setShowResetPasswordModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        createForm.reset();
        createForm.clearErrors();
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setSelectedUser(null);
        editForm.clearErrors();
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setSelectedUser(null);
    };

    const closeResetPasswordModal = () => {
        setShowResetPasswordModal(false);
        setSelectedUser(null);
        resetPasswordForm.reset();
        resetPasswordForm.clearErrors();
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportValidationError(null);
        setImportProcessing(false);
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds((currentSelection) => {
            const nextSelection = new Set(currentSelection);

            if (nextSelection.has(userId)) {
                nextSelection.delete(userId);
            } else {
                nextSelection.add(userId);
            }

            return nextSelection;
        });
    };

    const toggleSelectAllUsers = () => {
        if (allUsersSelected) {
            setSelectedUserIds(new Set());
            return;
        }

        setSelectedUserIds(new Set(users.map((user) => user.id)));
    };

    const clearUserSelection = () => {
        setSelectedUserIds(new Set());
    };

    const handleToggleStatus = async (user: ManagedUser) => {
        try {
            const response = await axios.post<{ data: ManagedUser }>(`/admin/users/${user.id}/toggle-status`);
            const nextActive = response.data?.data?.isActive ?? !(user.isActive !== false);

            toast.success(nextActive ? `Status ${user.name} diaktifkan.` : `Status ${user.name} dinonaktifkan.`);
            void fetchUsersJson();
        } catch (error) {
            toast.error(extractAxiosErrorMessage(error, 'Gagal mengubah status user.'));
        }
    };

    const handleCreateUser = (event: FormEvent) => {
        event.preventDefault();

        if (!createForm.data.name.trim()) {
            createForm.setError('name', 'Nama wajib diisi.');
            return;
        }

        if (!createForm.data.email.trim()) {
            createForm.setError('email', 'Email wajib diisi.');
            return;
        }

        if (!createForm.data.password.trim()) {
            createForm.setError('password', 'Password wajib diisi.');
            return;
        }

        createForm.post('/admin/users', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User berhasil dibuat.');
                closeCreateModal();
            },
            onError: (errors) => {
                toast.error(extractFirstError(errors, 'Gagal membuat user.'));
            },
        });
    };

    const handleEditUser = (event: FormEvent) => {
        event.preventDefault();

        if (!selectedUser) return;

        if (!editForm.data.name.trim()) {
            editForm.setError('name', 'Nama wajib diisi.');
            return;
        }

        if (!editForm.data.email.trim()) {
            editForm.setError('email', 'Email wajib diisi.');
            return;
        }

        editForm.put(`/admin/users/${selectedUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Data user berhasil diperbarui.');
                closeEditModal();
            },
            onError: (errors) => {
                toast.error(extractFirstError(errors, 'Gagal memperbarui user.'));
            },
        });
    };

    const handleDeleteUser = () => {
        if (!selectedUser) return;

        router.delete(`/admin/users/${selectedUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User berhasil dihapus.');
                closeDeleteModal();
            },
            onError: (errors) => {
                toast.error(extractFirstError(errors as Record<string, string>, 'Gagal menghapus user.'));
            },
        });
    };

    const handleResetPassword = (event: FormEvent) => {
        event.preventDefault();

        if (!selectedUser) return;

        if (!resetPasswordForm.data.password.trim()) {
            resetPasswordForm.setError('password', 'Password baru wajib diisi.');
            return;
        }

        resetPasswordForm.post(`/admin/users/${selectedUser.id}/reset-password`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Password user berhasil direset.');
                closeResetPasswordModal();
            },
            onError: (errors) => {
                toast.error(extractFirstError(errors, 'Gagal reset password user.'));
            },
        });
    };

    const handleBulkDelete = async () => {
        if (selectedUserIds.size === 0) return;

        const confirmed = window.confirm(`Hapus ${selectedUserIds.size} user yang dipilih? Aksi ini tidak bisa dibatalkan.`);
        if (!confirmed) return;

        setBulkProcessing(true);

        try {
            await axios.post('/admin/users/bulk-delete', {
                userIds: Array.from(selectedUserIds),
            });

            toast.success('User terpilih berhasil dihapus.');
            clearUserSelection();
            requestUsers({ page: 1 });
        } catch (error) {
            toast.error(extractAxiosErrorMessage(error, 'Gagal menghapus user terpilih.'));
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkRoleChange = async (nextRole: UserRole) => {
        if (selectedUserIds.size === 0) return;

        setBulkRole(nextRole);
        setBulkProcessing(true);

        try {
            await axios.post('/admin/users/bulk-role-change', {
                userIds: Array.from(selectedUserIds),
                role: nextRole,
            });

            toast.success('Role user terpilih berhasil diperbarui.');
            clearUserSelection();
            requestUsers({ page: pagination.page });
        } catch (error) {
            toast.error(extractAxiosErrorMessage(error, 'Gagal mengubah role user terpilih.'));
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleExportUsers = async () => {
        try {
            const exportResponse = await axios.get('/admin/users/export', {
                params: { limit: 1000, sortBy: 'createdAt', sortOrder: 'desc' },
            });

            const payload = exportResponse.data;
            const exportRows = (payload.data ?? []).map((user: User) => ({
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.createdAt,
            }));

            exportToCSV(exportRows, 'users-export.csv');
            toast.success('CSV user berhasil diunduh.');
        } catch (error) {
            toast.error(extractAxiosErrorMessage(error, 'Gagal export data user.'));
        }
    };

    const handleDownloadUserTemplate = () => {
        exportToCSV(USER_SAMPLE_ROWS, 'users-import-template.csv');
    };

    const handleImportFileChange = async (file: File | null) => {
        setImportFile(file);
        setImportPreview([]);
        setImportValidationError(null);

        if (!file) {
            return;
        }

        try {
            const rows = await parseCSV(file);
            validateCSVColumns(rows, USER_IMPORT_REQUIRED_COLUMNS);

            rows.forEach((row, index) => {
                if (!row.name?.trim() || !row.email?.trim() || !row.role?.trim()) {
                    throw new Error(`Data wajib kosong pada baris ${index + 2}.`);
                }

                if (!normalizeUserRole(row.role.trim().toLowerCase())) {
                    throw new Error(`Role tidak valid pada baris ${index + 2}.`);
                }
            });

            setImportPreview(rows.slice(0, 5));
        } catch (error) {
            setImportValidationError(error instanceof Error ? error.message : 'File CSV tidak valid.');
        }
    };

    const handleImportUsers = async () => {
        if (!importFile || importValidationError) return;

        const formData = new FormData();
        formData.append('file', importFile);
        setImportProcessing(true);

        try {
            await axios.post('/admin/users/bulk-import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success('Import user dari CSV berhasil.');
            closeImportModal();
            requestUsers({ page: 1 });
        } catch (error) {
            setImportValidationError(extractAxiosErrorMessage(error, 'Gagal import user dari CSV.'));
            toast.error(extractAxiosErrorMessage(error, 'Gagal import user dari CSV.'));
        } finally {
            setImportProcessing(false);
        }
    };

    return (
        <AppLayout title="Kelola Pengguna">
            <Head title="Admin - Kelola Pengguna" />

            <div className="space-y-6">
                <Breadcrumbs items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Pengguna' }]} />
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
                                    <UserCog className="h-6 w-6" style={{ color: 'var(--dm-accent)' }} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold" style={headingStyle}>
                                        Kelola Pengguna
                                    </h1>
                                    <p className="mt-2 text-brand-muted-dark">
                                        Kelola akun pengguna, peran, dan kredensial akses platform.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <SecondaryButton onClick={handleExportUsers} className="px-4 py-2 text-sm">
                                    <Download className="h-4 w-4" />
                                    Ekspor CSV
                                </SecondaryButton>
                                <SecondaryButton onClick={() => setShowImportModal(true)} className="px-4 py-2 text-sm">
                                    <Import className="h-4 w-4" />
                                    Impor CSV
                                </SecondaryButton>
                                <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                    <Plus className="h-4 w-4" />
                                    Tambah Pengguna
                                </PrimaryButton>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}>
                    <LiquidGlassCard intensity="light" className="space-y-5 p-5 sm:p-6" lightMode={true}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                <div>
                                    <label className="text-sm font-medium text-brand-dark">Cari</label>
                                    <div className="relative mt-1.5">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-600" />
                                        <input
                                            type="text"
                                            value={searchInput}
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            placeholder="Cari berdasarkan nama atau email"
                                            className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-700 shadow-brand-sm transition focus:border-brand-primary focus:outline-none focus:ring focus-visible:ring-brand-primary/20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-brand-dark">Peran</label>
                                    <select
                                        value={roleFilter}
                                        onChange={(event) => handleRoleFilterChange(event.target.value as FilterRole)}
                                        className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-brand-sm transition focus:border-brand-primary focus:outline-none focus:ring focus-visible:ring-brand-primary/20"
                                    >
                                        <option value="all">Semua</option>
                                        <option value="student">Mahasiswa</option>
                                        <option value="lecturer">Dosen</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                    <Filter className="h-3.5 w-3.5" />
                                    Filter aktif: {activeFiltersCount}
                                </div>
                                <SecondaryButton onClick={handleClearFilters} className="px-4 py-2 text-sm">
                                    Reset filter
                                </SecondaryButton>
                            </div>
                        </div>

                        {selectedUsersCount > 0 && (
                            <div className="flex flex-col gap-3 rounded-2xl border border-brand-primary/15 bg-brand-primary/5 p-4 lg:flex-row lg:items-center lg:justify-between">
                                <p className="text-sm font-medium text-brand-dark">{selectedUsersCount} pengguna dipilih</p>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void handleBulkDelete()}
                                        disabled={bulkProcessing}
                                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Hapus massal
                                    </button>
                                    <select
                                        value={bulkRole}
                                        onChange={(event) => void handleBulkRoleChange(event.target.value as UserRole)}
                                        disabled={bulkProcessing}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="student">Ubah peran ke Mahasiswa</option>
                                        <option value="lecturer">Ubah peran ke Dosen</option>
                                        <option value="admin">Ubah peran ke Admin</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={clearUserSelection}
                                        disabled={bulkProcessing}
                                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Bersihkan pilihan
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 border-t border-white/60 pt-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-brand-muted-dark">
                                Menampilkan {start}-{end} dari {total} pengguna
                            </p>

                            <div className="flex items-center gap-2">
                                <label className="text-sm text-brand-muted-dark">Item per halaman</label>
                                <select
                                    value={limit}
                                    onChange={(event) => handleLimitChange(Number(event.target.value))}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand-primary focus:outline-none"
                                >
                                    {[10, 20, 50].map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="hidden overflow-x-auto rounded-2xl border border-white/70 bg-white/55 md:block">
                                <table className="min-w-full divide-y divide-white/70">
                                    <thead className="bg-white/70">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">
                                                <input
                                                    type="checkbox"
                                                    checked={allUsersSelected}
                                                    onChange={toggleSelectAllUsers}
                                                    aria-label="Pilih semua pengguna"
                                                    className="h-4 w-4 rounded border-slate-300 text-brand-primary focus-visible:ring-brand-primary/30"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Nama</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Peran</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Dibuat</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--dm-text-muted)]">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/70">
                                        {showSkeleton ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRowSkeleton key={i} columns={7} />
                                            ))
                                        ) : userList.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8">
                                                    <EmptyState
                                                        icon={Search}
                                                        title="Tidak ada data ditemukan"
                                                        description="Coba ubah pencarian atau filter untuk menemukan pengguna."
                                                    />
                                                </td>
                                            </tr>
                                        ) : (
                                            userList.map((user) => (
                                                <tr key={user.id} className="transition-colors duration-150 hover:bg-[var(--dm-surface-hover)]">
                                                    <td className="px-4 py-3 text-sm text-slate-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUserIds.has(user.id)}
                                                            onChange={() => toggleUserSelection(user.id)}
                                                            aria-label={`Pilih ${user.name}`}
                                                            className="h-4 w-4 rounded border-slate-300 text-brand-primary focus-visible:ring-brand-primary/30"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-brand-dark">{user.name}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleConfig[user.role].className}`}>
                                                            {roleConfig[user.role].label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(user.createdAt)}</td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                                                user.isActive !== false
                                                                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                                    : 'border-amber-200 bg-amber-100 text-amber-700'
                                                            }`}
                                                        >
                                                            {user.isActive !== false ? 'Aktif' : 'Nonaktif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenActionsFor((prev) => (prev === user.id ? null : user.id))}
                                                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:text-brand-primary"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </button>

                                                            {openActionsFor === user.id && (
                                                                <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenActionsFor(null);
                                                                            openEdit(user);
                                                                        }}
                                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                                    >
                                                                        <UserPen className="h-4 w-4" />
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenActionsFor(null);
                                                                            openResetPassword(user);
                                                                        }}
                                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                                    >
                                                                        <RefreshCcw className="h-4 w-4" />
                                                                        Atur Ulang Password
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenActionsFor(null);
                                                                            void handleToggleStatus(user);
                                                                        }}
                                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                                    >
                                                                        {user.isActive !== false ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                                        {user.isActive !== false ? 'Nonaktifkan' : 'Aktifkan'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenActionsFor(null);
                                                                            openDelete(user);
                                                                        }}
                                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        Hapus
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="block space-y-4 md:hidden">
                                {userList.length === 0 ? (
                                    <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-8">
                                        <EmptyState
                                            icon={Search}
                                            title="Tidak ada data ditemukan"
                                            description="Coba ubah pencarian atau filter untuk menemukan user."
                                        />
                                    </div>
                                ) : (
                                    userList.map((user) => (
                                        <UserCard
                                            key={user.id}
                                            user={user}
                                            selected={selectedUserIds.has(user.id)}
                                            onToggleSelect={toggleUserSelection}
                                            onEdit={openEdit}
                                            onResetPassword={openResetPassword}
                                            onDelete={openDelete}
                                            onToggleStatus={handleToggleStatus}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        <AdminPagination
                            currentPage={paginationState.page}
                            totalPages={paginationState.totalPages}
                            totalItems={paginationState.total}
                            perPage={paginationState.limit}
                            onPageChange={(page: number) => requestUsers({ page })}
                            isLoading={isFetching}
                            itemLabel="pengguna"
                        />
                    </LiquidGlassCard>
                </motion.div>
            </div>

            <FormModal
                open={showImportModal}
                title="Impor Pengguna dari CSV"
                description="Unggah file CSV untuk membuat banyak user sekaligus. Pastikan kolom name, email, dan role tersedia."
                onClose={closeImportModal}
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            File CSV <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(event) => void handleImportFileChange(event.target.files?.[0] ?? null)}
                            className={inputClassName}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                        <div>
                            <p className="font-medium text-brand-dark">Template contoh</p>
                            <p className="mt-1">Gunakan template CSV agar format kolom sesuai.</p>
                        </div>
                        <SecondaryButton onClick={handleDownloadUserTemplate} className="px-4 py-2 text-sm">
                            <FileSpreadsheet className="h-4 w-4" />
                            Unduh Template
                        </SecondaryButton>
                    </div>

                    {importValidationError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                            {importValidationError}
                        </div>
                    )}

                    {importPreview.length > 0 && (
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-sm font-semibold text-brand-dark">Pratinjau (5 baris pertama)</h4>
                                <p className="mt-1 text-xs text-slate-500">Data di bawah ini di-parse langsung dari file yang dipilih.</p>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/70">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {USER_IMPORT_REQUIRED_COLUMNS.map((column) => (
                                                <th key={column} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                                    {column}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {importPreview.map((row, index) => (
                                            <tr key={`${row.email}-${index}`}>
                                                <td className="px-4 py-3 text-sm text-slate-700">{row.name}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{row.email}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{row.role}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div
                        className="flex gap-3 pt-4"
                        style={{ borderTop: '1px solid var(--dm-border)' }}
                    >
                        <SecondaryButton onClick={closeImportModal} className="flex-1">
                            Batal
                        </SecondaryButton>
                        <PrimaryButton className="flex-1" onClick={() => void handleImportUsers()} disabled={!importFile || !!importValidationError || importProcessing}>
                            {importProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Mengimpor...
                                </span>
                            ) : (
                                'Impor Pengguna'
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </FormModal>

            <FormModal
                open={showCreateModal}
                title="Tambah Pengguna"
                description="Tambahkan user baru ke dalam platform."
                onClose={closeCreateModal}
            >
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Nama <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={createForm.data.name}
                            onChange={(event) => createForm.setData('name', event.target.value)}
                            className={inputClassName}
                            placeholder="Nama lengkap"
                        />
                        <InputError message={createForm.errors.name} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Email <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="email"
                            value={createForm.data.email}
                            onChange={(event) => createForm.setData('email', event.target.value)}
                            className={inputClassName}
                            placeholder="user@domain.com"
                        />
                        <InputError message={createForm.errors.email} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Password <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="password"
                            value={createForm.data.password}
                            onChange={(event) => createForm.setData('password', event.target.value)}
                            className={inputClassName}
                            placeholder="Minimal 8 karakter"
                        />
                        <PasswordStrengthMeter password={createForm.data.password} />
                        <InputError message={createForm.errors.password} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">Peran</label>
                        <select
                            value={createForm.data.role}
                            onChange={(event) => createForm.setData('role', event.target.value as UserRole)}
                            className={inputClassName}
                        >
                            <option value="student">Mahasiswa</option>
                            <option value="lecturer">Dosen</option>
                            <option value="admin">Admin</option>
                        </select>
                        <InputError message={createForm.errors.role} />
                    </div>

                    <div
                        className="flex gap-3 pt-4"
                        style={{ borderTop: '1px solid var(--dm-border)' }}
                    >
                        <SecondaryButton onClick={closeCreateModal} className="flex-1">
                            Batal
                        </SecondaryButton>
                        <PrimaryButton type="submit" className="flex-1" disabled={createForm.processing}>
                            {createForm.processing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Menambahkan...
                                </span>
                            ) : (
                                'Tambah Pengguna'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={showEditModal}
                title="Edit Pengguna"
                description="Perbarui data user terpilih."
                onClose={closeEditModal}
            >
                <form onSubmit={handleEditUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Nama <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={editForm.data.name}
                            onChange={(event) => editForm.setData('name', event.target.value)}
                            className={inputClassName}
                        />
                        <InputError message={editForm.errors.name} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Email <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="email"
                            value={editForm.data.email}
                            onChange={(event) => editForm.setData('email', event.target.value)}
                            className={inputClassName}
                        />
                        <InputError message={editForm.errors.email} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">Peran</label>
                        <select
                            value={editForm.data.role}
                            onChange={(event) => editForm.setData('role', event.target.value as UserRole)}
                            className={inputClassName}
                        >
                            <option value="student">Mahasiswa</option>
                            <option value="lecturer">Dosen</option>
                            <option value="admin">Admin</option>
                        </select>
                        <InputError message={editForm.errors.role} />
                    </div>

                    <div
                        className="flex gap-3 pt-4"
                        style={{ borderTop: '1px solid var(--dm-border)' }}
                    >
                        <SecondaryButton onClick={closeEditModal} className="flex-1">
                            Batal
                        </SecondaryButton>
                        <PrimaryButton type="submit" className="flex-1" disabled={editForm.processing}>
                            {editForm.processing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Menyimpan...
                                </span>
                            ) : (
                                'Simpan Perubahan'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={showDeleteModal}
                title="Hapus Pengguna"
                description="Aksi ini tidak bisa dibatalkan. Pastikan Anda yakin sebelum melanjutkan."
                onClose={closeDeleteModal}
            >
                <div className="space-y-5">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        Anda akan menghapus user <span className="font-semibold">{selectedUser?.name}</span>.
                    </div>

                    <div
                        className="flex gap-3 pt-4"
                        style={{ borderTop: '1px solid var(--dm-border)' }}
                    >
                        <SecondaryButton onClick={closeDeleteModal} className="flex-1">
                            Batal
                        </SecondaryButton>
                        <PrimaryButton onClick={handleDeleteUser} className="flex-1" disabled={isFetching}>
                            Hapus Pengguna
                        </PrimaryButton>
                    </div>
                </div>
            </FormModal>

            <FormModal
                open={showResetPasswordModal}
                title="Atur Ulang Password"
                description="Masukkan password baru untuk user terpilih."
                onClose={closeResetPasswordModal}
            >
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Password Baru <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="password"
                            value={resetPasswordForm.data.password}
                            onChange={(event) => resetPasswordForm.setData('password', event.target.value)}
                            className={inputClassName}
                            placeholder="Minimal 8 karakter"
                        />
                        <InputError message={resetPasswordForm.errors.password} />
                    </div>

                    <div
                        className="flex gap-3 pt-4"
                        style={{ borderTop: '1px solid var(--dm-border)' }}
                    >
                        <SecondaryButton onClick={closeResetPasswordModal} className="flex-1">
                            Batal
                        </SecondaryButton>
                        <PrimaryButton type="submit" className="flex-1" disabled={resetPasswordForm.processing}>
                            {resetPasswordForm.processing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Mengatur ulang...
                                </span>
                            ) : (
                                'Atur Ulang Password'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </FormModal>
        </AppLayout>
    );
}
