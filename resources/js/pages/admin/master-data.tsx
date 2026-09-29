import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Archive,
    BookOpen,
    Copy,
    Download,
    Eye,
    Filter,
    FileSpreadsheet,
    Import,
    Loader2,
    MoreVertical,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    ShieldAlert,
    Trash2,
    Users,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import Breadcrumbs from '@/components/dashboard/Breadcrumbs';
import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { AdminPagination } from '@/components/ui/AdminPagination';
import { FormModal } from '@/components/ui/FormModal';
import { InputError } from '@/components/ui/input-error';
import { TableRowSkeleton } from '@/components/ui/skeletons';
import { toast } from '@/components/ui/toaster';
import { exportToCSV, parseCSV, validateCSVColumns, type CsvRecord } from '@/lib/csv-utils';
import { connectWebSocket, type AdminSocketHandle } from '@/lib/websocket';
import AppLayout from '@/layouts/app-layout';

interface LecturerOption {
    id: string;
    name: string;
    email: string;
}

interface CourseOwner {
    id: string;
    name: string;
    email?: string;
}

interface CourseGroup {
    id: string;
    name: string;
    memberCount?: number;
    member_count?: number;
    sessionDiscussionCount?: number;
    session_discussion_count?: number;
    _count?: {
        members?: number;
        sessionDiscussions?: number;
    };
}

interface CourseItem {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    ownerId?: string;
    owner_id?: string;
    owner?: CourseOwner | null;
    groupCount?: number;
    group_count?: number;
    groups_count?: number;
    studentCount?: number;
    student_count?: number;
    students_count?: number;
    _count?: {
        groups?: number;
        students?: number;
    };
    groups?: CourseGroup[];
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
    isArchived?: boolean;
    archivedAt?: string | null;
    archived_at?: string | null;
    archivedBy?: CourseOwner | null;
}

interface PaginationData {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface FilterData {
    search?: string;
    ownerId?: string;
}

interface PageProps {
    courses: CourseItem[];
    pagination: PaginationData;
    filters: FilterData;
    lecturers: LecturerOption[];
    tab?: 'active' | 'archived';
    message?: string | null;
}

const COURSE_IMPORT_REQUIRED_COLUMNS = ['code', 'name', 'owner_id'];
const COURSE_SAMPLE_ROWS = [
    { code: 'CS101', name: 'Introduction to Computing', description: 'Basic computing course', owner_id: 'lecturer-uuid' },
    { code: 'CS202', name: 'Data Structures', description: 'Advanced data structures', owner_id: 'lecturer-uuid' },
];

interface CourseFormData {
    code: string;
    name: string;
    description: string;
    ownerId: string;
}

interface ApiErrorResponse {
    error?: {
        message?: string;
        details?: unknown;
    };
    message?: string;
    errors?: Record<string, string | string[]>;
}

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

function extractErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const payload = error.response?.data;
        const details = payload?.error?.details;

        // Core validation failures carry { field, message } details — prefer the specific message.
        if (Array.isArray(details)) {
            for (const item of details) {
                if (item && typeof item === 'object' && 'message' in item && typeof item.message === 'string') {
                    return item.message;
                }
            }
        }

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

function normalizeErrors(error: unknown): Record<string, string> {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return {};
    }

    const payload = error.response?.data;
    const rawErrors = payload?.errors;

    if (rawErrors) {
        return Object.entries(rawErrors).reduce<Record<string, string>>((acc, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = value;
            } else if (Array.isArray(value) && value.length > 0) {
                acc[key] = value[0];
            }

            return acc;
        }, {});
    }

    const details = payload?.error?.details;

    if (!Array.isArray(details)) {
        return {};
    }

    return details.reduce<Record<string, string>>((acc, item) => {
        if (item && typeof item === 'object' && 'field' in item && 'message' in item && typeof item.field === 'string' && typeof item.message === 'string') {
            acc[item.field] = item.message;
        }

        return acc;
    }, {});
}

function getCourseOwnerName(course: CourseItem) {
    return course.owner?.name ?? 'Unassigned';
}

function getCourseOwnerId(course: CourseItem) {
    return course.owner?.id ?? course.ownerId ?? course.owner_id ?? '';
}

function getGroupCount(course: CourseItem) {
    return course.groupCount ?? course.group_count ?? course.groups_count ?? course._count?.groups ?? course.groups?.length ?? 0;
}

function getStudentCount(course: CourseItem) {
    return course.studentCount ?? course.student_count ?? course.students_count ?? course._count?.students ?? 0;
}

function getCreatedAt(course: CourseItem) {
    return course.createdAt ?? course.created_at ?? null;
}

function CourseCard({
    course,
    selected,
    onToggleSelect,
    onDetails,
    onEdit,
    onDelete,
}: {
    course: CourseItem;
    selected: boolean;
    onToggleSelect: (courseId: string) => void;
    onDetails: (course: CourseItem) => void;
    onEdit: (course: CourseItem) => void;
    onDelete: (course: CourseItem) => void;
}) {
    const groupCount = getGroupCount(course);
    const statusBadgeClassName = groupCount > 0
        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
        : 'border-amber-200 bg-amber-100 text-amber-700';
    const statusLabel = groupCount > 0 ? 'Active' : 'Draft';

    return (
        <LiquidGlassCard intensity="light" className="p-4 transition-shadow duration-200" lightMode={true}>
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <label className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                            <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => onToggleSelect(course.id)}
                                className="h-4 w-4 rounded border-slate-300 text-brand-primary focus-visible:ring-brand-primary/30"
                            />
                            Select course
                        </label>
                        <p className="text-sm font-semibold text-brand-primary">{course.code}</p>
                        <p className="mt-1 text-sm font-medium text-brand-dark">{course.name}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClassName}`}>
                        {statusLabel}
                    </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                    <p>
                        <span className="font-medium text-brand-dark">Owner:</span> {getCourseOwnerName(course)}
                    </p>
                    <p>
                        <span className="font-medium text-brand-dark">Groups:</span> {groupCount}
                    </p>
                    <p>
                        <span className="font-medium text-brand-dark">Created:</span> {formatDate(getCreatedAt(course))}
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => onDetails(course)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-brand-primary/35"
                    >
                        Details
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(course)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-brand-primary/35"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(course)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs text-rose-600 transition hover:bg-rose-100"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </LiquidGlassCard>
    );
}

export default function AdminMasterDataPage({ courses, pagination, filters, lecturers, tab = 'active' }: PageProps) {
    const isArchivedView = tab === 'archived';
    const [courseList, setCourseList] = useState<CourseItem[]>(courses);
    const [paginationState, setPaginationState] = useState<PaginationData>(pagination);
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const [ownerFilter, setOwnerFilter] = useState(filters.ownerId ?? 'all');
    const [limit, setLimit] = useState<number>(pagination.limit || 10);
    const [isFetching, setIsFetching] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(false);
    const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
    const [courseDetails, setCourseDetails] = useState<CourseItem | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<CsvRecord[]>([]);
    const [importValidationError, setImportValidationError] = useState<string | null>(null);
    const [importProcessing, setImportProcessing] = useState(false);

    const [createForm, setCreateForm] = useState<CourseFormData>({
        code: '',
        name: '',
        description: '',
        ownerId: lecturers[0]?.id ?? '',
    });
    const [editForm, setEditForm] = useState<CourseFormData>({
        code: '',
        name: '',
        description: '',
        ownerId: '',
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [createProcessing, setCreateProcessing] = useState(false);
    const [editProcessing, setEditProcessing] = useState(false);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [archiveProcessing, setArchiveProcessing] = useState(false);
    const [permanentDeleteProcessing, setPermanentDeleteProcessing] = useState(false);
    const [cloneProcessing, setCloneProcessing] = useState(false);
    const [cloneForm, setCloneForm] = useState({ name: '', code: '' });
    const [cloneErrors, setCloneErrors] = useState<Record<string, string>>({});
    const [permanentDeleteConfirmation, setPermanentDeleteConfirmation] = useState('');

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchInput.trim().length > 0) count += 1;
        if (ownerFilter !== 'all') count += 1;
        return count;
    }, [ownerFilter, searchInput]);

    const { start, end, total } = useMemo(() => {
        const s = paginationState.total === 0 ? 0 : (paginationState.page - 1) * paginationState.limit + 1;
        const e = Math.min(paginationState.page * paginationState.limit, paginationState.total);
        return { start: s, end: e, total: paginationState.total };
    }, [paginationState.page, paginationState.limit, paginationState.total]);

    useEffect(() => {
        setCourseList(courses);
    }, [courses]);

    useEffect(() => {
        setPaginationState(pagination);
    }, [pagination]);

    useEffect(() => {
        setSearchInput(filters.search ?? '');
        setOwnerFilter(filters.ownerId ?? 'all');
        setLimit(pagination.limit || 10);
    }, [filters.ownerId, filters.search, pagination.limit]);

    const fetchCoursesJson = useCallback(async () => {
        try {
            const response = await axios.get<{
                data: {
                    courses: CourseItem[];
                    pagination: PaginationData;
                    filters: FilterData;
                    tab?: 'active' | 'archived';
                };
            }>('/admin/master-data', {
                headers: {
                    Accept: 'application/json',
                },
                params: {
                    tab: isArchivedView ? 'archived' : 'active',
                    page: paginationState.page,
                    limit,
                    search: searchInput.trim() || undefined,
                    ownerId: ownerFilter !== 'all' ? ownerFilter : undefined,
                },
            });

            setCourseList(response.data.data.courses ?? []);
            setPaginationState((currentPagination) => response.data.data.pagination ?? currentPagination);
        } catch {
            toast.error('Failed to refresh course list.');
        }
    }, [isArchivedView, limit, ownerFilter, paginationState.page, searchInput]);

    useEffect(() => {
        let socket: AdminSocketHandle | null = null;

        void connectWebSocket({
            onMessage: (message) => {
                if (message.event === 'courses:created' || message.event === 'courses:updated' || message.event === 'courses:deleted') {
                    const actorName = (message.data as { actor?: { name?: string } })?.actor?.name;

                    if (message.event === 'courses:created' && actorName) {
                        toast.success(`New course added by ${actorName}`);
                    }

                    void fetchCoursesJson();
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
    }, [fetchCoursesJson]);

    useEffect(() => {
        if (!createForm.ownerId && lecturers[0]?.id) {
            setCreateForm((prev) => ({ ...prev, ownerId: lecturers[0].id }));
        }
    }, [createForm.ownerId, lecturers]);

    useEffect(() => {
        setSelectedCourseIds((currentSelection) => {
            const nextSelection = new Set(courses.filter((course) => currentSelection.has(course.id)).map((course) => course.id));

            if (nextSelection.size === currentSelection.size) {
                return currentSelection;
            }

            return nextSelection;
        });
    }, [courses]);

    const selectedCoursesCount = selectedCourseIds.size;
    const allCoursesSelected = courses.length > 0 && courses.every((course) => selectedCourseIds.has(course.id));

    const requestCourses = useCallback(({
        page = paginationState.page,
        limitValue = limit,
        ownerId = ownerFilter,
        search = searchInput.trim(),
    }: {
        page?: number;
        limitValue?: number;
        ownerId?: string;
        search?: string;
    } = {}) => {
        const startTime = Date.now();
        setIsFetching(true);
        setShowSkeleton(true);

        router.get(
            '/admin/master-data',
            {
                tab: isArchivedView ? 'archived' : 'active',
                page,
                limit: limitValue,
                search: search || undefined,
                ownerId: ownerId !== 'all' ? ownerId : undefined,
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
    }, [isArchivedView, limit, ownerFilter, paginationState.page, searchInput]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const normalizedServerSearch = (filters.search ?? '').trim();
            const normalizedInputSearch = searchInput.trim();

            if (normalizedServerSearch === normalizedInputSearch) {
                return;
            }

            requestCourses({ page: 1, search: normalizedInputSearch || undefined });
        }, 500);

        return () => clearTimeout(timeout);
    }, [filters.search, requestCourses, searchInput]);

    const handleOwnerFilterChange = (nextOwnerId: string) => {
        setOwnerFilter(nextOwnerId);
        requestCourses({ page: 1, ownerId: nextOwnerId });
    };

    const handleLimitChange = (nextLimit: number) => {
        setLimit(nextLimit);
        requestCourses({ page: 1, limitValue: nextLimit });
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setOwnerFilter('all');
        setLimit(10);
        requestCourses({ page: 1, ownerId: 'all', search: '', limitValue: 10 });
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreateForm({
            code: '',
            name: '',
            description: '',
            ownerId: lecturers[0]?.id ?? '',
        });
        setCreateErrors({});
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setSelectedCourse(null);
        setEditErrors({});
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setSelectedCourse(null);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setCourseDetails(null);
        setSelectedCourse(null);
    };

    const closeCloneModal = () => {
        setShowCloneModal(false);
        setSelectedCourse(null);
        setCloneForm({ name: '', code: '' });
        setCloneErrors({});
    };

    const closeArchiveModal = () => {
        setShowArchiveModal(false);
        setSelectedCourse(null);
    };

    const closePermanentDeleteModal = () => {
        setShowPermanentDeleteModal(false);
        setSelectedCourse(null);
        setPermanentDeleteConfirmation('');
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportValidationError(null);
        setImportProcessing(false);
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourseIds((currentSelection) => {
            const nextSelection = new Set(currentSelection);

            if (nextSelection.has(courseId)) {
                nextSelection.delete(courseId);
            } else {
                nextSelection.add(courseId);
            }

            return nextSelection;
        });
    };

    const toggleSelectAllCourses = () => {
        if (allCoursesSelected) {
            setSelectedCourseIds(new Set());
            return;
        }

        setSelectedCourseIds(new Set(courses.map((course) => course.id)));
    };

    const clearCourseSelection = () => {
        setSelectedCourseIds(new Set());
    };

    const openClone = (course: CourseItem) => {
        setSelectedCourse(course);
        // Core clone schema requires ^[A-Z0-9]+$ max 10 chars.
        const base = course.code.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
        setCloneForm({
            name: `Copy of ${course.name}`,
            code: `${base}C1`,
        });
        setCloneErrors({});
        setShowCloneModal(true);
    };

    const openEdit = (course: CourseItem) => {
        setSelectedCourse(course);
        setEditForm({
            code: course.code,
            name: course.name,
            description: course.description ?? '',
            ownerId: getCourseOwnerId(course),
        });
        setEditErrors({});
        setShowEditModal(true);
    };

    const openArchive = (course: CourseItem) => {
        setSelectedCourse(course);
        setShowArchiveModal(true);
    };

    const openPermanentDelete = (course: CourseItem) => {
        setSelectedCourse(course);
        setPermanentDeleteConfirmation('');
        setShowPermanentDeleteModal(true);
    };

    const openDetails = async (course: CourseItem) => {
        setSelectedCourse(course);
        setShowDetailsModal(true);
        setIsLoadingDetails(true);

        try {
            const response = await axios.get(`/admin/master-data/${course.id}`);
            setCourseDetails(response.data?.data ?? response.data);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal memuat detail course.'));
            setCourseDetails(course);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const validateCourseForm = (form: CourseFormData) => {
        const errors: Record<string, string> = {};

        if (!form.code.trim()) errors.code = 'Code wajib diisi.';
        if (!form.name.trim()) errors.name = 'Name wajib diisi.';
        if (!form.ownerId) errors.ownerId = 'Owner wajib dipilih.';

        return errors;
    };

    const handleCreateCourse = async (event: FormEvent) => {
        event.preventDefault();

        const payload = {
            code: createForm.code.trim().toUpperCase(),
            name: createForm.name.trim(),
            description: createForm.description.trim(),
            ownerId: createForm.ownerId,
        };

        const validationErrors = validateCourseForm(payload);
        if (Object.keys(validationErrors).length > 0) {
            setCreateErrors(validationErrors);
            return;
        }

        setCreateProcessing(true);
        setCreateErrors({});

        try {
            await axios.post('/admin/master-data', payload);
            toast.success('Course berhasil dibuat.');
            closeCreateModal();
            requestCourses({ page: 1 });
        } catch (error) {
            setCreateErrors(normalizeErrors(error));
            toast.error(extractErrorMessage(error, 'Gagal membuat course.'));
        } finally {
            setCreateProcessing(false);
        }
    };

    const handleEditCourse = async (event: FormEvent) => {
        event.preventDefault();

        if (!selectedCourse) return;

        const payload = {
            code: editForm.code.trim().toUpperCase(),
            name: editForm.name.trim(),
            description: editForm.description.trim(),
            ownerId: editForm.ownerId,
        };

        const validationErrors = validateCourseForm(payload);
        if (Object.keys(validationErrors).length > 0) {
            setEditErrors(validationErrors);
            return;
        }

        setEditProcessing(true);
        setEditErrors({});

        try {
            await axios.put(`/admin/master-data/${selectedCourse.id}`, payload);
            toast.success('Course berhasil diperbarui.');
            closeEditModal();
            requestCourses();
        } catch (error) {
            setEditErrors(normalizeErrors(error));
            toast.error(extractErrorMessage(error, 'Gagal memperbarui course.'));
        } finally {
            setEditProcessing(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedCourse) return;

        setDeleteProcessing(true);

        try {
            await axios.delete(`/admin/master-data/${selectedCourse.id}`);
            toast.success('Course berhasil dihapus.');
            closeDeleteModal();
            requestCourses();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal menghapus course.'));
        } finally {
            setDeleteProcessing(false);
        }
    };

    const handleCloneCourse = async (event: FormEvent) => {
        event.preventDefault();
        if (!selectedCourse) return;

        setCloneErrors({});
        setCloneProcessing(true);

        try {
            await axios.post(`/admin/master-data/${selectedCourse.id}/clone`, {
                name: cloneForm.name,
                code: cloneForm.code,
            });
            toast.success('Course berhasil di-clone.');
            closeCloneModal();
            requestCourses();
        } catch (error) {
            const validationErrors = normalizeErrors(error);

            if (Object.keys(validationErrors).length > 0) {
                setCloneErrors(validationErrors);
            } else {
                toast.error(extractErrorMessage(error, 'Gagal meng-clone course.'));
            }
        } finally {
            setCloneProcessing(false);
        }
    };

    const handleArchiveCourse = async () => {
        if (!selectedCourse) return;

        setArchiveProcessing(true);

        try {
            await axios.post(`/admin/master-data/${selectedCourse.id}/archive`);
            toast.success('Course berhasil diarsipkan.');
            closeArchiveModal();
            requestCourses();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal mengarsipkan course.'));
        } finally {
            setArchiveProcessing(false);
        }
    };

    const handleRestoreCourse = async (course: CourseItem) => {
        try {
            await axios.post(`/admin/master-data/${course.id}/restore`);
            toast.success('Course berhasil dipulihkan.');
            requestCourses();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal memulihkan course.'));
        }
    };

    const handlePermanentDeleteCourse = async () => {
        if (!selectedCourse) return;

        setPermanentDeleteProcessing(true);

        try {
            await axios.delete(`/admin/master-data/${selectedCourse.id}/permanent`);
            toast.success('Course berhasil dihapus permanen.');
            closePermanentDeleteModal();
            requestCourses();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal menghapus permanen course.'));
        } finally {
            setPermanentDeleteProcessing(false);
        }
    };

    const handleBulkActivate = async () => {
        if (selectedCourseIds.size === 0) return;

        setBulkProcessing(true);

        try {
            await axios.post('/admin/master-data/bulk-activate', {
                courseIds: Array.from(selectedCourseIds),
            });
            toast.success('Course terpilih berhasil diaktifkan.');
            clearCourseSelection();
            requestCourses();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal mengaktifkan course terpilih.'));
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkDeactivate = async () => {
        if (selectedCourseIds.size === 0) return;

        setBulkProcessing(true);

        try {
            await axios.post('/admin/master-data/bulk-deactivate', {
                courseIds: Array.from(selectedCourseIds),
            });
            toast.success('Course terpilih berhasil dinonaktifkan.');
            clearCourseSelection();
            requestCourses();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal menonaktifkan course terpilih.'));
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleExportCourses = async () => {
        try {
            const exportResponse = await axios.get('/admin/master-data/export', {
                params: { limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
            });

            const payload = exportResponse.data;
            const exportRows = (payload.data ?? []).map((course: CourseItem) => ({
                code: course.code,
                name: course.name,
                description: course.description ?? '',
                owner_id: getCourseOwnerId(course),
            }));

            exportToCSV(exportRows, 'courses-export.csv');
            toast.success('CSV course berhasil diunduh.');
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal export data course.'));
        }
    };

    const handleDownloadCourseTemplate = () => {
        exportToCSV(COURSE_SAMPLE_ROWS, 'courses-import-template.csv');
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
            validateCSVColumns(rows, COURSE_IMPORT_REQUIRED_COLUMNS);

            rows.forEach((row, index) => {
                if (!row.code?.trim() || !row.name?.trim() || !row.owner_id?.trim()) {
                    throw new Error(`Data wajib kosong pada baris ${index + 2}.`);
                }
            });

            setImportPreview(rows.slice(0, 5));
        } catch (error) {
            setImportValidationError(error instanceof Error ? error.message : 'File CSV tidak valid.');
        }
    };

    const handleImportCourses = async () => {
        if (!importFile || importValidationError) return;

        const formData = new FormData();
        formData.append('file', importFile);
        setImportProcessing(true);

        try {
            await axios.post('/admin/master-data/bulk-import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success('Import course dari CSV berhasil.');
            closeImportModal();
            requestCourses({ page: 1 });
        } catch (error) {
            const message = extractErrorMessage(error, 'Gagal import course dari CSV.');
            setImportValidationError(message);
            toast.error(message);
        } finally {
            setImportProcessing(false);
        }
    };

    const detailCourse = courseDetails ?? selectedCourse;
    const detailGroups = detailCourse?.groups ?? [];
    const selectedCourseGroupCount = selectedCourse ? getGroupCount(selectedCourse) : 0;
    const isPermanentDeleteConfirmed = permanentDeleteConfirmation.trim() === (selectedCourse?.code ?? '');

    return (
        <AppLayout title="Data Kelas">
            <Head title="Admin - Data Kelas" />

            <div className="space-y-6">
                <Breadcrumbs items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Data Kelas' }]} />
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
                                    <BookOpen className="h-6 w-6" style={{ color: 'var(--dm-accent)' }} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold" style={headingStyle}>
                                        Data Kelas
                                    </h1>
                                    <p className="mt-2 text-brand-muted-dark">
                                        Kelola kelas aktif dan kelas yang diarsipkan untuk kebutuhan administrasi.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {!isArchivedView && (
                                    <>
                                        <SecondaryButton onClick={() => void handleExportCourses()} className="px-4 py-2 text-sm">
                                            <Download className="h-4 w-4" />
                                            Ekspor CSV
                                        </SecondaryButton>
                                        <SecondaryButton onClick={() => setShowImportModal(true)} className="px-4 py-2 text-sm">
                                            <Import className="h-4 w-4" />
                                            Impor CSV
                                        </SecondaryButton>
                                    </>
                                )}
                                {!isArchivedView && (
                                    <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                        <Plus className="h-4 w-4" />
                                        Tambah Kelas
                                    </PrimaryButton>
                                )}
                            </div>
                        </div>
                    </LiquidGlassCard>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}>
                    <LiquidGlassCard intensity="light" className="space-y-5 p-5 sm:p-6" lightMode={true}>
                        <div className="flex flex-wrap gap-3 border-b border-white/60 pb-4">
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-full border border-brand-primary/15 bg-brand-primary/10 px-4 py-2 text-sm font-medium text-brand-primary"
                            >
                                <BookOpen className="h-4 w-4" />
                                Kelas Aktif
                            </button>
                            <button
                                type="button"
                                onClick={() => router.visit('/admin/master-data?tab=archived', { preserveScroll: true })}
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                                    isArchivedView
                                        ? 'border-brand-primary/15 bg-brand-primary/10 text-brand-primary'
                                        : 'border-slate-200 bg-white/70 text-slate-600'
                                }`}
                            >
                                <Archive className="h-4 w-4" />
                                Kelas Diarsipkan
                            </button>
                            <button
                                type="button"
                                disabled
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-gray-600"
                            >
                                <Users className="h-4 w-4" />
                                Kategori (Phase 2)
                            </button>
                        </div>

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
                                            placeholder="Cari berdasarkan kode atau nama kelas"
                                            className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-700 shadow-brand-sm transition focus:border-brand-primary focus:outline-none focus:ring focus-visible:ring-brand-primary/20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-brand-dark">Dosen pengampu</label>
                                    <select
                                        value={ownerFilter}
                                        onChange={(event) => handleOwnerFilterChange(event.target.value)}
                                        className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-brand-sm transition focus:border-brand-primary focus:outline-none focus:ring focus-visible:ring-brand-primary/20"
                                    >
                                        <option value="all">Semua dosen</option>
                                        {lecturers.map((lecturer) => (
                                            <option key={lecturer.id} value={lecturer.id}>
                                                {lecturer.name}
                                            </option>
                                        ))}
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

                        <div className="flex flex-col gap-3 border-t border-white/60 pt-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-brand-muted-dark">Menampilkan {start}-{end} dari {total} {isArchivedView ? 'kelas arsip' : 'kelas'}</p>

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

                        {!isArchivedView && selectedCoursesCount > 0 && (
                            <div className="flex flex-col gap-3 rounded-2xl border border-brand-primary/15 bg-brand-primary/5 p-4 lg:flex-row lg:items-center lg:justify-between">
                                <p className="text-sm font-medium text-brand-dark">{selectedCoursesCount} courses selected</p>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void handleBulkActivate()}
                                        disabled={bulkProcessing}
                                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Bulk Activate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleBulkDeactivate()}
                                        disabled={bulkProcessing}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Bulk Deactivate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearCourseSelection}
                                        disabled={bulkProcessing}
                                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <div className="hidden overflow-x-auto rounded-2xl border border-white/70 bg-white/55 md:block">
                                <table className="min-w-full divide-y divide-white/70">
                                    <thead className="bg-white/70">
                                        <tr>
                                            {!isArchivedView && (
                                                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                                    <input
                                                        type="checkbox"
                                                        checked={allCoursesSelected}
                                                        onChange={toggleSelectAllCourses}
                                                        aria-label="Select all courses"
                                                        className="h-4 w-4 rounded border-slate-300 text-brand-primary focus-visible:ring-brand-primary/30"
                                                    />
                                                </th>
                                            )}
                                            <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">Code</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">Owner</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">Groups</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">Students</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">Created</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/70">
                                        {showSkeleton ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRowSkeleton key={i} columns={isArchivedView ? 7 : 8} />
                                            ))
                                        ) : courseList.length === 0 ? (
                                            <tr>
                                                <td colSpan={isArchivedView ? 7 : 8} className="px-4 py-16 text-center text-sm text-brand-muted-dark">
                                                    {isArchivedView ? 'No archived courses found.' : 'No courses found. Try changing search or filters.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            courseList.map((course) => (
                                                <tr key={course.id} className="hover:bg-white/60">
                                                    {!isArchivedView && (
                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCourseIds.has(course.id)}
                                                                onChange={() => toggleCourseSelection(course.id)}
                                                                aria-label={`Select ${course.name}`}
                                                                className="h-4 w-4 rounded border-slate-300 text-brand-primary focus-visible:ring-brand-primary/30"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 text-sm font-semibold text-brand-primary">{course.code}</td>
                                                    <td className="px-4 py-3 text-sm text-brand-dark">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{course.name}</p>
                                                                {course.isArchived && (
                                                                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                                                        Archived
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                                                                {course.description?.trim() || 'No description provided.'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{getCourseOwnerName(course)}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{getGroupCount(course)}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{getStudentCount(course)}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(getCreatedAt(course))}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenActionsFor((prev) => (prev === course.id ? null : course.id))}
                                                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:text-brand-primary"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </button>

                                                            {openActionsFor === course.id && (
                                                                <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenActionsFor(null);
                                                                            void openDetails(course);
                                                                        }}
                                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                        View Details
                                                                    </button>
                                                                    {!isArchivedView ? (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setOpenActionsFor(null);
                                                                                    openEdit(course);
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                                            >
                                                                                <Pencil className="h-4 w-4" />
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setOpenActionsFor(null);
                                                                                    openClone(course);
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                                            >
                                                                                <Copy className="h-4 w-4" />
                                                                                Clone
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setOpenActionsFor(null);
                                                                                    openArchive(course);
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                                                                            >
                                                                                <Archive className="h-4 w-4" />
                                                                                Archive
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setOpenActionsFor(null);
                                                                                    void handleRestoreCourse(course);
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                                                                            >
                                                                                <RotateCcw className="h-4 w-4" />
                                                                                Restore
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setOpenActionsFor(null);
                                                                                    openPermanentDelete(course);
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                                Delete Permanently
                                                                            </button>
                                                                        </>
                                                                    )}
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
                                {courseList.length === 0 ? (
                                    <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-12 text-center text-sm text-brand-muted-dark">
                                        {isArchivedView ? 'No archived courses found.' : 'No courses found. Try changing search or filters.'}
                                    </div>
                                ) : (
                                    courseList.map((course) => (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                            selected={selectedCourseIds.has(course.id)}
                                            onToggleSelect={toggleCourseSelection}
                                            onDetails={(item) => {
                                                void openDetails(item);
                                            }}
                                            onEdit={openEdit}
                                            onDelete={isArchivedView ? openPermanentDelete : openArchive}
                                        />
                                    ))
                                )}
                            </div>

                        </div>

                        <AdminPagination
                            currentPage={paginationState.page}
                            totalPages={paginationState.totalPages || 1}
                            totalItems={paginationState.total}
                            perPage={paginationState.limit}
                            onPageChange={(page: number) => requestCourses({ page })}
                            isLoading={isFetching}
                            itemLabel="mata kuliah"
                        />
                    </LiquidGlassCard>
                </motion.div>
            </div>

            <FormModal
                open={showImportModal}
                title="Import Courses from CSV"
                description="Upload file CSV untuk membuat banyak course sekaligus. Wajib ada kolom code, name, dan owner_id."
                onClose={closeImportModal}
                maxWidth="max-w-2xl"
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            CSV File <span className="text-brand-primary">*</span>
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
                            <p className="font-medium text-brand-dark">Sample template</p>
                            <p className="mt-1">Gunakan template CSV ini agar struktur import sesuai dengan backend.</p>
                        </div>
                        <SecondaryButton onClick={handleDownloadCourseTemplate} className="px-4 py-2 text-sm">
                            <FileSpreadsheet className="h-4 w-4" />
                            Download Template
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
                                <h4 className="text-sm font-semibold text-brand-dark">Preview (first 5 rows)</h4>
                                <p className="mt-1 text-xs text-slate-500">Preview ini membantu cek code, name, description, dan owner_id sebelum upload.</p>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/70">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {['code', 'name', 'description', 'owner_id'].map((column) => (
                                                <th key={column} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                                    {column}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {importPreview.map((row, index) => (
                                            <tr key={`${row.code}-${index}`}>
                                                <td className="px-4 py-3 text-sm text-slate-700">{row.code}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{row.name}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{row.description}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{row.owner_id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <SecondaryButton onClick={closeImportModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton className="flex-1" onClick={() => void handleImportCourses()} disabled={!importFile || !!importValidationError || importProcessing}>
                            {importProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Importing...
                                </span>
                            ) : (
                                'Import Courses'
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </FormModal>

            <FormModal
                open={showCreateModal}
                title="Create Course"
                description="Tambahkan course baru beserta owner dosen yang bertanggung jawab."
                onClose={closeCreateModal}
            >
                <form onSubmit={(event) => void handleCreateCourse(event)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Code <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={createForm.code}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                            className={inputClassName}
                            placeholder="e.g. CS101"
                        />
                        <InputError message={createErrors.code} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Name <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={createForm.name}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                            className={inputClassName}
                            placeholder="Course name"
                        />
                        <InputError message={createErrors.name} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">Description</label>
                        <textarea
                            value={createForm.description}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                            className={`${inputClassName} min-h-28 resize-none`}
                            placeholder="Optional description for this course"
                        />
                        <InputError message={createErrors.description} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Owner <span className="text-brand-primary">*</span>
                        </label>
                        <select
                            value={createForm.ownerId}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, ownerId: event.target.value }))}
                            className={inputClassName}
                        >
                            <option value="">Select lecturer</option>
                            {lecturers.map((lecturer) => (
                                <option key={lecturer.id} value={lecturer.id}>
                                    {lecturer.name} ({lecturer.email})
                                </option>
                            ))}
                        </select>
                        <InputError message={createErrors.ownerId} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <SecondaryButton onClick={closeCreateModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" className="flex-1" disabled={createProcessing}>
                            {createProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Creating...
                                </span>
                            ) : (
                                'Create Course'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={showEditModal}
                title="Edit Course"
                description="Perbarui informasi course yang dipilih."
                onClose={closeEditModal}
            >
                <form onSubmit={(event) => void handleEditCourse(event)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Code <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={editForm.code}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                            className={inputClassName}
                        />
                        <InputError message={editErrors.code} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Name <span className="text-brand-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={editForm.name}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                            className={inputClassName}
                        />
                        <InputError message={editErrors.name} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">Description</label>
                        <textarea
                            value={editForm.description}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                            className={`${inputClassName} min-h-28 resize-none`}
                        />
                        <InputError message={editErrors.description} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">
                            Owner <span className="text-brand-primary">*</span>
                        </label>
                        <select
                            value={editForm.ownerId}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, ownerId: event.target.value }))}
                            className={inputClassName}
                        >
                            <option value="">Select lecturer</option>
                            {lecturers.map((lecturer) => (
                                <option key={lecturer.id} value={lecturer.id}>
                                    {lecturer.name} ({lecturer.email})
                                </option>
                            ))}
                        </select>
                        <InputError message={editErrors.ownerId} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <SecondaryButton onClick={closeEditModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" className="flex-1" disabled={editProcessing}>
                            {editProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Saving...
                                </span>
                            ) : (
                                'Save Changes'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={showDeleteModal}
                title="Delete Course"
                description="Aksi ini tidak bisa dibatalkan. Pastikan Anda yakin sebelum melanjutkan."
                onClose={closeDeleteModal}
            >
                <div className="space-y-5">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        Anda akan menghapus course <span className="font-semibold">{selectedCourse?.name}</span> ({selectedCourse?.code}).
                    </div>

                    {selectedCourseGroupCount > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                            Warning: course ini masih memiliki {selectedCourseGroupCount} group. Pastikan penghapusan memang diizinkan oleh Core API.
                        </div>
                    )}

                    <div className="flex gap-3">
                        <SecondaryButton onClick={closeDeleteModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton onClick={() => void handleDeleteCourse()} className="flex-1" disabled={deleteProcessing}>
                            {deleteProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Deleting...
                                </span>
                            ) : (
                                'Delete Course'
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </FormModal>

            <FormModal
                open={showArchiveModal}
                title="Archive Course"
                description="This will hide the course from active list. You can restore it later."
                onClose={closeArchiveModal}
            >
                <div className="space-y-5">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <p className="font-semibold">{selectedCourse?.name}</p>
                        <p className="mt-1">Code: {selectedCourse?.code}</p>
                        <p className="mt-1">Groups: {selectedCourseGroupCount}</p>
                    </div>
                    <div className="flex gap-3">
                        <SecondaryButton onClick={closeArchiveModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton onClick={() => void handleArchiveCourse()} className="flex-1" disabled={archiveProcessing}>
                            {archiveProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Archiving...
                                </span>
                            ) : (
                                'Archive'
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </FormModal>

            <FormModal
                open={showPermanentDeleteModal}
                title="Delete Permanently"
                description="This action CANNOT be undone. All course data will be permanently deleted."
                onClose={closePermanentDeleteModal}
            >
                <div className="space-y-5">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-semibold">Type the course code to confirm permanent deletion.</p>
                                <p className="mt-1">Expected code: <span className="font-bold">{selectedCourse?.code}</span></p>
                            </div>
                        </div>
                    </div>

                    <input
                        type="text"
                        value={permanentDeleteConfirmation}
                        onChange={(event) => setPermanentDeleteConfirmation(event.target.value)}
                        className={inputClassName}
                        placeholder="Type course code"
                    />

                    <div className="flex gap-3">
                        <SecondaryButton onClick={closePermanentDeleteModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={() => void handlePermanentDeleteCourse()}
                            className="flex-1"
                            disabled={permanentDeleteProcessing || !isPermanentDeleteConfirmed}
                        >
                            {permanentDeleteProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Deleting...
                                </span>
                            ) : (
                                'Delete Permanently'
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </FormModal>

            <FormModal
                open={showDetailsModal}
                title="Course Details"
                description="Informasi lengkap course beserta daftar group yang terhubung."
                onClose={closeDetailsModal}
                maxWidth="max-w-2xl"
            >
                {isLoadingDetails ? (
                    <div className="flex items-center justify-center py-10 text-sm text-slate-600">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading course details...
                    </div>
                ) : detailCourse ? (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Course Code</p>
                                <p className="mt-2 text-base font-semibold text-brand-primary">{detailCourse.code}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Owner</p>
                                <p className="mt-2 text-base font-semibold text-brand-dark">{getCourseOwnerName(detailCourse)}</p>
                                <p className="mt-1 text-sm text-slate-500">{detailCourse.owner?.email ?? 'No email info'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 md:col-span-2">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Course Name</p>
                                <p className="mt-2 text-base font-semibold text-brand-dark">{detailCourse.name}</p>
                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                    {detailCourse.description?.trim() || 'No description provided for this course.'}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Groups</p>
                                <p className="mt-2 text-2xl font-semibold text-brand-dark">{getGroupCount(detailCourse)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Students</p>
                                <p className="mt-2 text-2xl font-semibold text-brand-dark">{getStudentCount(detailCourse)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Created</p>
                                <p className="mt-2 text-base font-semibold text-brand-dark">{formatDate(getCreatedAt(detailCourse))}</p>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-base font-semibold text-brand-dark">Groups List</h4>
                                    <p className="mt-1 text-sm text-slate-500">Daftar group yang berada di bawah course ini.</p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {detailGroups.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                                        No groups found for this course.
                                    </div>
                                ) : (
                                    detailGroups.map((group) => (
                                        <div key={group.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-brand-dark">{group.name}</p>
                                                    <p className="mt-1 text-xs text-slate-500">Group ID: {group.id}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                                        Members: {group.memberCount ?? group.member_count ?? group._count?.members ?? 0}
                                                    </span>
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                                        Sesi Diskusi: {group.sessionDiscussionCount ?? group.session_discussion_count ?? group._count?.sessionDiscussions ?? 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                        Course details are not available.
                    </div>
                )}
            </FormModal>

            <FormModal
                open={showCloneModal}
                title="Clone Course"
                description="Buat salinan course dengan nama dan kode baru."
                onClose={closeCloneModal}
            >
                <form onSubmit={handleCloneCourse} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-brand-dark">Course Name</label>
                        <input
                            type="text"
                            value={cloneForm.name}
                            onChange={(event) => setCloneForm((prev) => ({ ...prev, name: event.target.value }))}
                            className={inputClassName}
                            placeholder="Enter new course name"
                        />
                        <InputError message={cloneErrors.name} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-dark">Course Code</label>
                        <input
                            type="text"
                            value={cloneForm.code}
                            onChange={(event) => setCloneForm((prev) => ({ ...prev, code: event.target.value }))}
                            className={inputClassName}
                            placeholder="Enter new course code"
                        />
                        <InputError message={cloneErrors.code} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <SecondaryButton onClick={closeCloneModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" className="flex-1" disabled={cloneProcessing}>
                            {cloneProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Cloning...
                                </span>
                            ) : (
                                'Clone Course'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </FormModal>

        </AppLayout>
    );
}
