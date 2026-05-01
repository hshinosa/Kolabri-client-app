import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Archive,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Eye,
    Filter,
    FileSpreadsheet,
    FolderArchive,
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
    X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { InputError } from '@/components/ui/input-error';
import { toast } from '@/components/ui/toaster';
import { exportToCSV, parseCSV, validateCSVColumns, type CsvRecord } from '@/lib/csv-utils';
import { connectWebSocket } from '@/lib/websocket';
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
    chatSpaceCount?: number;
    chat_space_count?: number;
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

interface TemplateGroupItem {
    name: string;
    description?: string;
}

interface CourseTemplateItem {
    id: string;
    name: string;
    description?: string | null;
    namePattern: string;
    descriptionTemplate?: string | null;
    defaultGroups: TemplateGroupItem[];
    createdAt?: string;
    created_at?: string;
    createdBy?: CourseOwner | null;
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
        details?: string;
    };
    message?: string;
    errors?: Record<string, string | string[]>;
}

interface TemplateFormData {
    name: string;
    description: string;
    namePattern: string;
    descriptionTemplate: string;
    defaultGroups: TemplateGroupItem[];
    sourceCourseId?: string;
}

interface CreateFromTemplateFormData {
    code: string;
    name: string;
    description: string;
    ownerId: string;
}

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const inputClassName =
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#88161c] focus:outline-none focus:ring focus:ring-[#88161c]/20';

const buttonSpinner = <Loader2 className="h-4 w-4 animate-spin" />;

function formatDate(date?: string | null) {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
        return [1, 2, 3, 4, 'ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 2) {
        return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

function extractErrorMessage(error: unknown, fallback: string) {
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

function normalizeErrors(error: unknown): Record<string, string> {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return {};
    }

    const rawErrors = error.response?.data?.errors;
    if (!rawErrors) return {};

    return Object.entries(rawErrors).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof value === 'string') {
            acc[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
            acc[key] = value[0];
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
    return course.groupCount ?? course.group_count ?? course.groups_count ?? course.groups?.length ?? 0;
}

function getStudentCount(course: CourseItem) {
    return course.studentCount ?? course.student_count ?? course.students_count ?? 0;
}

function getCreatedAt(course: CourseItem) {
    return course.createdAt ?? course.created_at ?? null;
}

function getTemplateCreatedAt(template: CourseTemplateItem) {
    return template.createdAt ?? template.created_at ?? null;
}

function FormModal({
    open,
    title,
    description,
    children,
    onClose,
    maxWidth = 'max-w-lg',
}: {
    open: boolean;
    title: string;
    description: string;
    children: React.ReactNode;
    onClose: () => void;
    maxWidth?: string;
}) {
    if (!open) return null;

    return (
        <AnimatePresence>
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        className={`w-full ${maxWidth} rounded-3xl p-6 shadow-2xl`}
                        style={{
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.6)',
                        }}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold" style={headingStyle}>
                                    {title}
                                </h3>
                                <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-black/5 hover:text-[#4A4A4A]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mt-6">{children}</div>
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
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
                                className="h-4 w-4 rounded border-slate-300 text-[#88161c] focus:ring-[#88161c]/30"
                            />
                            Select course
                        </label>
                        <p className="text-sm font-semibold text-[#88161c]">{course.code}</p>
                        <p className="mt-1 text-sm font-medium text-[#4A4A4A]">{course.name}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClassName}`}>
                        {statusLabel}
                    </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                    <p>
                        <span className="font-medium text-[#4A4A4A]">Owner:</span> {getCourseOwnerName(course)}
                    </p>
                    <p>
                        <span className="font-medium text-[#4A4A4A]">Groups:</span> {groupCount}
                    </p>
                    <p>
                        <span className="font-medium text-[#4A4A4A]">Created:</span> {formatDate(getCreatedAt(course))}
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => onDetails(course)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-[#88161c]/35"
                    >
                        Details
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(course)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-[#88161c]/35"
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
    const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showCreateFromTemplateModal, setShowCreateFromTemplateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
    const [courseDetails, setCourseDetails] = useState<CourseItem | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplateItem | null>(null);
    const [templateLibrary, setTemplateLibrary] = useState<CourseTemplateItem[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
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
    const [templateProcessing, setTemplateProcessing] = useState(false);
    const [createFromTemplateProcessing, setCreateFromTemplateProcessing] = useState(false);
    const [cloneForm, setCloneForm] = useState({ name: '', code: '' });
    const [cloneErrors, setCloneErrors] = useState<Record<string, string>>({});
    const [templateForm, setTemplateForm] = useState<TemplateFormData>({
        name: '',
        description: '',
        namePattern: '{semester} - {subject}',
        descriptionTemplate: '',
        defaultGroups: [{ name: 'Group A', description: '' }],
    });
    const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});
    const [createFromTemplateForm, setCreateFromTemplateForm] = useState<CreateFromTemplateFormData>({
        code: '',
        name: '',
        description: '',
        ownerId: lecturers[0]?.id ?? '',
    });
    const [createFromTemplateErrors, setCreateFromTemplateErrors] = useState<Record<string, string>>({});
    const [permanentDeleteConfirmation, setPermanentDeleteConfirmation] = useState('');

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchInput.trim().length > 0) count += 1;
        if (ownerFilter !== 'all') count += 1;
        return count;
    }, [ownerFilter, searchInput]);

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
        let socket: WebSocket | null = null;

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

    useEffect(() => {
        if (!createFromTemplateForm.ownerId && lecturers[0]?.id) {
            setCreateFromTemplateForm((prev) => ({ ...prev, ownerId: lecturers[0].id }));
        }
    }, [createFromTemplateForm.ownerId, lecturers]);

    useEffect(() => {
        void fetchTemplates();
    }, []);

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
        setIsFetching(true);

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
                onFinish: () => setIsFetching(false),
            },
        );
    }, [isArchivedView, limit, ownerFilter, paginationState.page, searchInput]);

    const fetchTemplates = async () => {
        setTemplatesLoading(true);

        try {
            const response = await axios.get('/admin/course-templates/list');
            setTemplateLibrary(response.data?.data ?? []);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal memuat template course.'));
        } finally {
            setTemplatesLoading(false);
        }
    };

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

    const closeTemplateModal = () => {
        setShowTemplateModal(false);
        setTemplateErrors({});
        setTemplateForm({
            name: '',
            description: '',
            namePattern: '{semester} - {subject}',
            descriptionTemplate: '',
            defaultGroups: [{ name: 'Group A', description: '' }],
        });
    };

    const closeCreateFromTemplateModal = () => {
        setShowCreateFromTemplateModal(false);
        setSelectedTemplate(null);
        setCreateFromTemplateErrors({});
        setCreateFromTemplateForm({
            code: '',
            name: '',
            description: '',
            ownerId: lecturers[0]?.id ?? '',
        });
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
        setCloneForm({
            name: `Copy of ${course.name}`,
            code: `${course.code}_copy`,
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

    const openTemplateFromCourse = (course: CourseItem) => {
        setSelectedCourse(course);
        setTemplateForm({
            name: `${course.name} Template`,
            description: course.description ?? '',
            namePattern: '{semester} - {subject}',
            descriptionTemplate: course.description ?? '',
            defaultGroups: [{ name: 'Group A', description: '' }],
            sourceCourseId: course.id,
        });
        setTemplateErrors({});
        setShowTemplateModal(true);
    };

    const openCreateFromTemplate = (template: CourseTemplateItem) => {
        setSelectedTemplate(template);
        setCreateFromTemplateForm({
            code: '',
            name: template.namePattern,
            description: template.descriptionTemplate ?? '',
            ownerId: lecturers[0]?.id ?? '',
        });
        setCreateFromTemplateErrors({});
        setShowCreateFromTemplateModal(true);
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

    const handleTemplateGroupChange = (index: number, field: keyof TemplateGroupItem, value: string) => {
        setTemplateForm((prev) => ({
            ...prev,
            defaultGroups: prev.defaultGroups.map((group, groupIndex) =>
                groupIndex === index ? { ...group, [field]: value } : group,
            ),
        }));
    };

    const handleAddTemplateGroup = () => {
        setTemplateForm((prev) => ({
            ...prev,
            defaultGroups: [...prev.defaultGroups, { name: '', description: '' }],
        }));
    };

    const handleRemoveTemplateGroup = (index: number) => {
        setTemplateForm((prev) => ({
            ...prev,
            defaultGroups: prev.defaultGroups.filter((_, groupIndex) => groupIndex !== index),
        }));
    };

    const handleSaveTemplate = async (event: FormEvent) => {
        event.preventDefault();

        setTemplateErrors({});
        setTemplateProcessing(true);

        try {
            await axios.post('/admin/course-templates', {
                name: templateForm.name.trim(),
                description: templateForm.description.trim(),
                namePattern: templateForm.namePattern.trim(),
                descriptionTemplate: templateForm.descriptionTemplate.trim(),
                defaultGroups: templateForm.defaultGroups.map((group) => ({
                    name: group.name.trim(),
                    description: group.description?.trim() || undefined,
                })),
                sourceCourseId: templateForm.sourceCourseId,
            });
            toast.success('Template berhasil disimpan.');
            closeTemplateModal();
            await fetchTemplates();
        } catch (error) {
            setTemplateErrors(normalizeErrors(error));
            toast.error(extractErrorMessage(error, 'Gagal menyimpan template.'));
        } finally {
            setTemplateProcessing(false);
        }
    };

    const handleCreateCourseFromTemplate = async (event: FormEvent) => {
        event.preventDefault();
        if (!selectedTemplate) return;

        setCreateFromTemplateErrors({});
        setCreateFromTemplateProcessing(true);

        try {
            await axios.post(`/admin/master-data/from-template/${selectedTemplate.id}`, {
                code: createFromTemplateForm.code.trim().toUpperCase(),
                name: createFromTemplateForm.name.trim(),
                description: createFromTemplateForm.description.trim(),
                ownerId: createFromTemplateForm.ownerId,
            });
            toast.success('Course dari template berhasil dibuat.');
            closeCreateFromTemplateModal();
            router.visit('/admin/master-data?tab=active', { preserveScroll: true });
        } catch (error) {
            setCreateFromTemplateErrors(normalizeErrors(error));
            toast.error(extractErrorMessage(error, 'Gagal membuat course dari template.'));
        } finally {
            setCreateFromTemplateProcessing(false);
        }
    };

    const handleDeleteTemplate = async (template: CourseTemplateItem) => {
        try {
            await axios.delete(`/admin/course-templates/${template.id}`);
            toast.success('Template berhasil dihapus.');
            await fetchTemplates();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal menghapus template.'));
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
            const response = await axios.get('/api/auth/token');
            const token = response.data?.data?.token;

            if (!token) {
                throw new Error('Missing auth token');
            }

            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000';
            const exportResponse = await fetch(`${apiBaseUrl}/api/admin/courses?limit=1000&sortBy=createdAt&sortOrder=desc`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!exportResponse.ok) {
                throw new Error('Failed to fetch course data');
            }

            const payload = await exportResponse.json();
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

        const total = paginationState.total;
        const start = total === 0 ? 0 : (paginationState.page - 1) * paginationState.limit + 1;
        const end = Math.min(paginationState.page * paginationState.limit, total);
        const paginationItems = getPaginationItems(paginationState.page, paginationState.totalPages || 1);

    const detailCourse = courseDetails ?? selectedCourse;
    const detailGroups = detailCourse?.groups ?? [];
    const selectedCourseGroupCount = selectedCourse ? getGroupCount(selectedCourse) : 0;
    const isPermanentDeleteConfirmed = permanentDeleteConfirmation.trim() === (selectedCourse?.code ?? '');

    return (
        <AppLayout title="Master Data Management">
            <Head title="Admin - Master Data Management" />

            <div className="space-y-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <BookOpen className="h-6 w-6" style={{ color: '#88161c' }} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold" style={headingStyle}>
                                        Master Data Management
                                    </h1>
                                    <p className="mt-2 text-[#6B7280]">
                                        Kelola course aktif, course yang diarsipkan, dan template course untuk kebutuhan administrasi.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <SecondaryButton onClick={() => void router.visit('/admin/templates')} className="px-4 py-2 text-sm">
                                    <FolderArchive className="h-4 w-4" />
                                    Template Library
                                </SecondaryButton>
                                {!isArchivedView && (
                                    <>
                                        <SecondaryButton onClick={() => void handleExportCourses()} className="px-4 py-2 text-sm">
                                            <Download className="h-4 w-4" />
                                            Export CSV
                                        </SecondaryButton>
                                        <SecondaryButton onClick={() => setShowImportModal(true)} className="px-4 py-2 text-sm">
                                            <Import className="h-4 w-4" />
                                            Import CSV
                                        </SecondaryButton>
                                    </>
                                )}
                                {!isArchivedView && (
                                    <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                        <Plus className="h-4 w-4" />
                                        Add Course
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
                                className="inline-flex items-center gap-2 rounded-full border border-[#88161c]/15 bg-[#88161c]/10 px-4 py-2 text-sm font-medium text-[#88161c]"
                            >
                                <BookOpen className="h-4 w-4" />
                                Active Courses
                            </button>
                            <button
                                type="button"
                                onClick={() => router.visit('/admin/master-data?tab=archived', { preserveScroll: true })}
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                                    isArchivedView
                                        ? 'border-[#88161c]/15 bg-[#88161c]/10 text-[#88161c]'
                                        : 'border-slate-200 bg-white/70 text-slate-600'
                                }`}
                            >
                                <Archive className="h-4 w-4" />
                                Archived Courses
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowTemplateModal(true)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600"
                            >
                                <FolderArchive className="h-4 w-4" />
                                Templates
                            </button>
                            <button
                                type="button"
                                disabled
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-400"
                            >
                                <Users className="h-4 w-4" />
                                Categories (Phase 2)
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                <div>
                                    <label className="text-sm font-medium text-[#4A4A4A]">Search</label>
                                    <div className="relative mt-1.5">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchInput}
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            placeholder="Search by code or course name"
                                            className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-700 shadow-sm transition focus:border-[#88161c] focus:outline-none focus:ring focus:ring-[#88161c]/20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-[#4A4A4A]">Owner</label>
                                    <select
                                        value={ownerFilter}
                                        onChange={(event) => handleOwnerFilterChange(event.target.value)}
                                        className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#88161c] focus:outline-none focus:ring focus:ring-[#88161c]/20"
                                    >
                                        <option value="all">All Lecturers</option>
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
                                    Active Filters: {activeFiltersCount}
                                </div>
                                <SecondaryButton onClick={handleClearFilters} className="px-4 py-2 text-sm">
                                    Clear Filters
                                </SecondaryButton>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-white/60 pt-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-[#6B7280]">Showing {start}-{end} of {total} {isArchivedView ? 'archived courses' : 'courses'}</p>

                            <div className="flex items-center gap-2">
                                <label className="text-sm text-[#6B7280]">Items per page</label>
                                <select
                                    value={limit}
                                    onChange={(event) => handleLimitChange(Number(event.target.value))}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-[#88161c] focus:outline-none"
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
                            <div className="flex flex-col gap-3 rounded-2xl border border-[#88161c]/15 bg-[#88161c]/5 p-4 lg:flex-row lg:items-center lg:justify-between">
                                <p className="text-sm font-medium text-[#4A4A4A]">{selectedCoursesCount} courses selected</p>

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
                            {isFetching && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/65 backdrop-blur-[2px]">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white px-4 py-2 text-sm text-[#4A4A4A] shadow-sm">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading courses...
                                    </div>
                                </div>
                            )}

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
                                                        className="h-4 w-4 rounded border-slate-300 text-[#88161c] focus:ring-[#88161c]/30"
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
                                        {courseList.length === 0 ? (
                                            <tr>
                                                <td colSpan={isArchivedView ? 7 : 8} className="px-4 py-16 text-center text-sm text-[#6B7280]">
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
                                                                className="h-4 w-4 rounded border-slate-300 text-[#88161c] focus:ring-[#88161c]/30"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 text-sm font-semibold text-[#88161c]">{course.code}</td>
                                                    <td className="px-4 py-3 text-sm text-[#4A4A4A]">
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
                                                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:text-[#88161c]"
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
                                                                                    openTemplateFromCourse(course);
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                                            >
                                                                                <FolderArchive className="h-4 w-4" />
                                                                                Save as Template
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
                                    <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-12 text-center text-sm text-[#6B7280]">
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

                            <div className="mt-6 rounded-2xl border border-white/70 bg-white/45 p-4">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-semibold text-[#4A4A4A]">Template Library</h3>
                                        <p className="mt-1 text-sm text-slate-500">Simpan struktur course tanpa konten, lalu buat course baru lebih cepat.</p>
                                    </div>
                                    <SecondaryButton onClick={() => void router.visit('/admin/templates')} className="px-4 py-2 text-sm">
                                        Open Full Library
                                    </SecondaryButton>
                                </div>

                                {templatesLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading templates...
                                    </div>
                                ) : templateLibrary.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                                        Belum ada template course yang tersimpan.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {templateLibrary.slice(0, 4).map((template) => (
                                            <div key={template.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#4A4A4A]">{template.name}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{template.description?.trim() || 'No description provided.'}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDeleteTemplate(template)}
                                                        className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Pattern: {template.namePattern}</span>
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Groups: {template.defaultGroups?.length ?? 0}</span>
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Created: {formatDate(getTemplateCreatedAt(template))}</span>
                                                </div>
                                                <div className="mt-4 flex gap-2">
                                                    <SecondaryButton onClick={() => openCreateFromTemplate(template)} className="flex-1 px-4 py-2 text-sm">
                                                        Create from Template
                                                    </SecondaryButton>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-white/60 pt-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => requestCourses({ page: paginationState.page - 1 })}
                                    disabled={paginationState.page <= 1 || isFetching}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Prev
                                </button>

                                <button
                                    type="button"
                                    onClick={() => requestCourses({ page: paginationState.page + 1 })}
                                    disabled={paginationState.page >= paginationState.totalPages || isFetching}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                {paginationItems.map((item, index) => {
                                    if (item === 'ellipsis') {
                                        return (
                                            <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-500">
                                                ...
                                            </span>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => requestCourses({ page: item })}
                                            className={`h-9 min-w-9 rounded-lg px-3 text-sm transition ${
                                                paginationState.page === item
                                                    ? 'bg-[#88161c] text-white'
                                                    : 'border border-slate-200 bg-white text-slate-700 hover:border-[#88161c]/40'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">
                            CSV File <span className="text-[#88161c]">*</span>
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
                            <p className="font-medium text-[#4A4A4A]">Sample template</p>
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
                                <h4 className="text-sm font-semibold text-[#4A4A4A]">Preview (first 5 rows)</h4>
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">
                            Code <span className="text-[#88161c]">*</span>
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">
                            Name <span className="text-[#88161c]">*</span>
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">Description</label>
                        <textarea
                            value={createForm.description}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                            className={`${inputClassName} min-h-28 resize-none`}
                            placeholder="Optional description for this course"
                        />
                        <InputError message={createErrors.description} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">
                            Owner <span className="text-[#88161c]">*</span>
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
                        <PrimaryButton className="flex-1" disabled={createProcessing}>
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">
                            Code <span className="text-[#88161c]">*</span>
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">
                            Name <span className="text-[#88161c]">*</span>
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">Description</label>
                        <textarea
                            value={editForm.description}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                            className={`${inputClassName} min-h-28 resize-none`}
                        />
                        <InputError message={editErrors.description} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">
                            Owner <span className="text-[#88161c]">*</span>
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
                        <PrimaryButton className="flex-1" disabled={editProcessing}>
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
                                <p className="mt-2 text-base font-semibold text-[#88161c]">{detailCourse.code}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Owner</p>
                                <p className="mt-2 text-base font-semibold text-[#4A4A4A]">{getCourseOwnerName(detailCourse)}</p>
                                <p className="mt-1 text-sm text-slate-500">{detailCourse.owner?.email ?? 'No email info'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 md:col-span-2">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Course Name</p>
                                <p className="mt-2 text-base font-semibold text-[#4A4A4A]">{detailCourse.name}</p>
                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                    {detailCourse.description?.trim() || 'No description provided for this course.'}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Groups</p>
                                <p className="mt-2 text-2xl font-semibold text-[#4A4A4A]">{getGroupCount(detailCourse)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Students</p>
                                <p className="mt-2 text-2xl font-semibold text-[#4A4A4A]">{getStudentCount(detailCourse)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Created</p>
                                <p className="mt-2 text-base font-semibold text-[#4A4A4A]">{formatDate(getCreatedAt(detailCourse))}</p>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-base font-semibold text-[#4A4A4A]">Groups List</h4>
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
                                                    <p className="text-sm font-semibold text-[#4A4A4A]">{group.name}</p>
                                                    <p className="mt-1 text-xs text-slate-500">Group ID: {group.id}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                                        Members: {group.memberCount ?? group.member_count ?? 0}
                                                    </span>
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                                        Chat Spaces: {group.chatSpaceCount ?? group.chat_space_count ?? 0}
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">Course Name</label>
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
                        <label className="block text-sm font-medium text-[#4A4A4A]">Course Code</label>
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
                        <PrimaryButton className="flex-1" disabled={cloneProcessing}>
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

            <FormModal
                open={showTemplateModal}
                title="Save as Template"
                description="Simpan struktur course agar bisa dipakai ulang untuk semester berikutnya."
                onClose={closeTemplateModal}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={(event) => void handleSaveTemplate(event)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-[#4A4A4A]">Template Name</label>
                            <input
                                type="text"
                                value={templateForm.name}
                                onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
                                className={inputClassName}
                            />
                            <InputError message={templateErrors.name} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#4A4A4A]">Name Pattern</label>
                            <input
                                type="text"
                                value={templateForm.namePattern}
                                onChange={(event) => setTemplateForm((prev) => ({ ...prev, namePattern: event.target.value }))}
                                className={inputClassName}
                                placeholder="{semester} - {subject}"
                            />
                            <p className="mt-1 text-xs text-slate-500">Placeholders: {'{semester}'}, {'{subject}'}, {'{year}'}</p>
                            <InputError message={templateErrors.namePattern} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">Description</label>
                        <input
                            type="text"
                            value={templateForm.description}
                            onChange={(event) => setTemplateForm((prev) => ({ ...prev, description: event.target.value }))}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">Description Template</label>
                        <textarea
                            value={templateForm.descriptionTemplate}
                            onChange={(event) => setTemplateForm((prev) => ({ ...prev, descriptionTemplate: event.target.value }))}
                            className={`${inputClassName} min-h-28 resize-none`}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <label className="block text-sm font-medium text-[#4A4A4A]">Default Groups</label>
                            <SecondaryButton onClick={handleAddTemplateGroup} className="px-3 py-2 text-sm">
                                Add Group
                            </SecondaryButton>
                        </div>

                        {templateForm.defaultGroups.map((group, index) => (
                            <div
                                key={`template-group-${index}`}
                                className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                            >
                                <input
                                    type="text"
                                    value={group.name}
                                    onChange={(event) => handleTemplateGroupChange(index, 'name', event.target.value)}
                                    className={inputClassName}
                                    placeholder="Group name"
                                />
                                <input
                                    type="text"
                                    value={group.description ?? ''}
                                    onChange={(event) => handleTemplateGroupChange(index, 'description', event.target.value)}
                                    className={inputClassName}
                                    placeholder="Group description"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTemplateGroup(index)}
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm text-rose-600"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <SecondaryButton onClick={closeTemplateModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton className="flex-1" disabled={templateProcessing}>
                            {templateProcessing ? (
                                <span className="inline-flex items-center gap-2">
                                    {buttonSpinner}
                                    Saving...
                                </span>
                            ) : (
                                'Save Template'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={showCreateFromTemplateModal}
                title="Create from Template"
                description="Review template structure and create a new course from it."
                onClose={closeCreateFromTemplateModal}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={(event) => void handleCreateCourseFromTemplate(event)} className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                        <p className="text-sm font-semibold text-[#4A4A4A]">{selectedTemplate?.name}</p>
                        <p className="mt-2 text-xs text-slate-500">Pattern: {selectedTemplate?.namePattern}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Groups: {selectedTemplate?.defaultGroups?.map((group) => group.name).join(', ') || '-'}
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-[#4A4A4A]">Course Code</label>
                            <input
                                type="text"
                                value={createFromTemplateForm.code}
                                onChange={(event) =>
                                    setCreateFromTemplateForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                                }
                                className={inputClassName}
                            />
                            <InputError message={createFromTemplateErrors.code} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#4A4A4A]">Owner</label>
                            <select
                                value={createFromTemplateForm.ownerId}
                                onChange={(event) => setCreateFromTemplateForm((prev) => ({ ...prev, ownerId: event.target.value }))}
                                className={inputClassName}
                            >
                                <option value="">Select lecturer</option>
                                {lecturers.map((lecturer) => (
                                    <option key={lecturer.id} value={lecturer.id}>
                                        {lecturer.name} ({lecturer.email})
                                    </option>
                                ))}
                            </select>
                            <InputError message={createFromTemplateErrors.ownerId} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">Course Name</label>
                        <input
                            type="text"
                            value={createFromTemplateForm.name}
                            onChange={(event) => setCreateFromTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
                            className={inputClassName}
                        />
                        <InputError message={createFromTemplateErrors.name} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">Course Description</label>
                        <textarea
                            value={createFromTemplateForm.description}
                            onChange={(event) => setCreateFromTemplateForm((prev) => ({ ...prev, description: event.target.value }))}
                            className={`${inputClassName} min-h-28 resize-none`}
                        />
                        <InputError message={createFromTemplateErrors.description} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <SecondaryButton onClick={closeCreateFromTemplateModal} className="flex-1">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton className="flex-1" disabled={createFromTemplateProcessing}>
                            {createFromTemplateProcessing ? (
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
        </AppLayout>
    );
}
