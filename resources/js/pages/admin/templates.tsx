import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CalendarDays, FolderArchive, Loader2, Pencil, Plus, Trash2, User2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { InputError } from '@/components/ui/input-error';
import { toast } from '@/components/ui/toaster';
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

interface TemplateFormData {
    name: string;
    description: string;
    namePattern: string;
    descriptionTemplate: string;
    defaultGroups: TemplateGroupItem[];
}

interface CreateFromTemplateFormData {
    code: string;
    name: string;
    description: string;
    ownerId: string;
}

interface ApiErrorResponse {
    error?: {
        message?: string;
    };
    message?: string;
    errors?: Record<string, string | string[]>;
}

interface PageProps {
    templates: CourseTemplateItem[];
    lecturers: LecturerOption[];
}

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const inputClassName =
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#88161c] focus:outline-none focus:ring focus:ring-[#88161c]/20';

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
        return error.response?.data?.error?.message ?? error.response?.data?.message ?? fallback;
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
        if (typeof value === 'string') acc[key] = value;
        else if (Array.isArray(value) && value.length > 0) acc[key] = value[0];
        return acc;
    }, {});
}

function Modal({
    open,
    title,
    description,
    children,
    onClose,
}: {
    open: boolean;
    title: string;
    description: string;
    children: React.ReactNode;
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-2xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold" style={headingStyle}>
                        {title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function AdminTemplatesPage({ templates, lecturers }: PageProps) {
    const [items, setItems] = useState(templates);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplateItem | null>(null);
    const [templateForm, setTemplateForm] = useState<TemplateFormData>({
        name: '',
        description: '',
        namePattern: '{semester} - {subject}',
        descriptionTemplate: '',
        defaultGroups: [{ name: 'Group A', description: '' }],
    });
    const [createCourseForm, setCreateCourseForm] = useState<CreateFromTemplateFormData>({
        code: '',
        name: '',
        description: '',
        ownerId: lecturers[0]?.id ?? '',
    });
    const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});
    const [createCourseErrors, setCreateCourseErrors] = useState<Record<string, string>>({});
    const [templateProcessing, setTemplateProcessing] = useState(false);
    const [createCourseProcessing, setCreateCourseProcessing] = useState(false);

    const totalGroups = useMemo(
        () => items.reduce((sum, template) => sum + (template.defaultGroups?.length ?? 0), 0),
        [items],
    );

    const refreshTemplates = async () => {
        const response = await axios.get('/admin/course-templates/list');
        setItems(response.data?.data ?? []);
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

    const closeCreateCourseModal = () => {
        setShowCreateCourseModal(false);
        setSelectedTemplate(null);
        setCreateCourseErrors({});
        setCreateCourseForm({
            code: '',
            name: '',
            description: '',
            ownerId: lecturers[0]?.id ?? '',
        });
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

    const handleCreateTemplate = async (event: FormEvent) => {
        event.preventDefault();
        setTemplateErrors({});
        setTemplateProcessing(true);

        try {
            await axios.post('/admin/course-templates', {
                ...templateForm,
                defaultGroups: templateForm.defaultGroups.map((group) => ({
                    name: group.name.trim(),
                    description: group.description?.trim() || undefined,
                })),
            });
            toast.success('Template berhasil dibuat.');
            closeTemplateModal();
            await refreshTemplates();
        } catch (error) {
            setTemplateErrors(normalizeErrors(error));
            toast.error(extractErrorMessage(error, 'Gagal membuat template.'));
        } finally {
            setTemplateProcessing(false);
        }
    };

    const handleDeleteTemplate = async (template: CourseTemplateItem) => {
        try {
            await axios.delete(`/admin/course-templates/${template.id}`);
            toast.success('Template berhasil dihapus.');
            await refreshTemplates();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal menghapus template.'));
        }
    };

    const openUseTemplate = (template: CourseTemplateItem) => {
        setSelectedTemplate(template);
        setCreateCourseForm({
            code: '',
            name: template.namePattern,
            description: template.descriptionTemplate ?? '',
            ownerId: lecturers[0]?.id ?? '',
        });
        setCreateCourseErrors({});
        setShowCreateCourseModal(true);
    };

    const handleCreateCourse = async (event: FormEvent) => {
        event.preventDefault();
        if (!selectedTemplate) return;

        setCreateCourseErrors({});
        setCreateCourseProcessing(true);

        try {
            await axios.post(`/admin/master-data/from-template/${selectedTemplate.id}`, {
                code: createCourseForm.code.trim().toUpperCase(),
                name: createCourseForm.name.trim(),
                description: createCourseForm.description.trim(),
                ownerId: createCourseForm.ownerId,
            });
            toast.success('Course berhasil dibuat dari template.');
            closeCreateCourseModal();
            router.visit('/admin/master-data?tab=active', { preserveScroll: true });
        } catch (error) {
            setCreateCourseErrors(normalizeErrors(error));
            toast.error(extractErrorMessage(error, 'Gagal membuat course dari template.'));
        } finally {
            setCreateCourseProcessing(false);
        }
    };

    return (
        <AppLayout title="Course Templates">
            <Head title="Admin - Course Templates" />

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
                                    <FolderArchive className="h-6 w-6" style={{ color: '#88161c' }} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold" style={headingStyle}>
                                        Course Template Library
                                    </h1>
                                    <p className="mt-2 text-slate-500">
                                        Kelola template struktur course untuk mempercepat pembukaan kelas baru dan menjaga konsistensi group default.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <SecondaryButton onClick={() => void router.visit('/admin/master-data')} className="px-4 py-2 text-sm">
                                    Back to Master Data
                                </SecondaryButton>
                                <PrimaryButton onClick={() => setShowTemplateModal(true)}>
                                    <Plus className="h-4 w-4" />
                                    Create New Template
                                </PrimaryButton>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}>
                    <div className="grid gap-4 md:grid-cols-3">
                        <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Templates</p>
                            <p className="mt-3 text-3xl font-semibold text-[#4A4A4A]">{items.length}</p>
                        </LiquidGlassCard>
                        <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Default Groups</p>
                            <p className="mt-3 text-3xl font-semibold text-[#4A4A4A]">{totalGroups}</p>
                        </LiquidGlassCard>
                        <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Available Owners</p>
                            <p className="mt-3 text-3xl font-semibold text-[#4A4A4A]">{lecturers.length}</p>
                        </LiquidGlassCard>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.4 }}>
                    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                        {items.length === 0 ? (
                            <LiquidGlassCard intensity="light" className="col-span-full px-6 py-16 text-center" lightMode={true}>
                                <p className="text-sm text-slate-500">Belum ada template course yang tersedia.</p>
                            </LiquidGlassCard>
                        ) : (
                            items.map((template) => (
                                <LiquidGlassCard key={template.id} intensity="light" className="p-5" lightMode={true}>
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-lg font-semibold text-[#4A4A4A]">{template.name}</p>
                                                <p className="mt-1 text-sm text-slate-500">{template.description?.trim() || 'No description provided.'}</p>
                                            </div>
                                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                                {template.defaultGroups?.length ?? 0} groups
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <FolderArchive className="h-4 w-4 text-[#88161c]" />
                                                <span>{template.namePattern}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User2 className="h-4 w-4 text-[#88161c]" />
                                                <span>{template.createdBy?.name ?? 'Unknown creator'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4 text-[#88161c]" />
                                                <span>{formatDate(template.createdAt ?? template.created_at)}</span>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Default Groups</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(template.defaultGroups ?? []).map((group, index) => (
                                                    <span key={`${template.id}-group-${index}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                                        {group.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <SecondaryButton onClick={() => openUseTemplate(template)} className="px-3 py-2 text-sm">
                                                Use Template
                                            </SecondaryButton>
                                            <SecondaryButton onClick={() => openUseTemplate(template)} className="px-3 py-2 text-sm">
                                                <Pencil className="h-4 w-4" />
                                                Edit
                                            </SecondaryButton>
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteTemplate(template)}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </LiquidGlassCard>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>

            <Modal
                open={showTemplateModal}
                title="Create New Template"
                description="Define a reusable course structure with placeholders and default groups."
                onClose={closeTemplateModal}
            >
                <form onSubmit={(event) => void handleCreateTemplate(event)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-[#4A4A4A]">Template Name</label>
                            <input type="text" value={templateForm.name} onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))} className={inputClassName} />
                            <InputError message={templateErrors.name} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#4A4A4A]">Name Pattern</label>
                            <input type="text" value={templateForm.namePattern} onChange={(event) => setTemplateForm((prev) => ({ ...prev, namePattern: event.target.value }))} className={inputClassName} placeholder="{semester} - {subject}" />
                            <InputError message={templateErrors.namePattern} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">Description</label>
                        <input type="text" value={templateForm.description} onChange={(event) => setTemplateForm((prev) => ({ ...prev, description: event.target.value }))} className={inputClassName} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">Description Template</label>
                        <textarea value={templateForm.descriptionTemplate} onChange={(event) => setTemplateForm((prev) => ({ ...prev, descriptionTemplate: event.target.value }))} className={`${inputClassName} min-h-28 resize-none`} />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <label className="block text-sm font-medium text-[#4A4A4A]">Default Groups</label>
                            <SecondaryButton onClick={handleAddTemplateGroup} className="px-3 py-2 text-sm">Add Group</SecondaryButton>
                        </div>
                        {templateForm.defaultGroups.map((group, index) => (
                            <div key={`group-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                                <input type="text" value={group.name} onChange={(event) => handleTemplateGroupChange(index, 'name', event.target.value)} className={inputClassName} placeholder="Group name" />
                                <input type="text" value={group.description ?? ''} onChange={(event) => handleTemplateGroupChange(index, 'description', event.target.value)} className={inputClassName} placeholder="Group description" />
                                <button type="button" onClick={() => handleRemoveTemplateGroup(index)} className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm text-rose-600">Remove</button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <SecondaryButton onClick={closeTemplateModal} className="flex-1">Cancel</SecondaryButton>
                        <PrimaryButton className="flex-1" disabled={templateProcessing}>
                            {templateProcessing ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span> : 'Save Template'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal
                open={showCreateCourseModal}
                title="Create Course from Template"
                description="Preview the template and create a new course from its saved structure."
                onClose={closeCreateCourseModal}
            >
                <form onSubmit={(event) => void handleCreateCourse(event)} className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                        <p className="text-sm font-semibold text-[#4A4A4A]">{selectedTemplate?.name}</p>
                        <p className="mt-2 text-xs text-slate-500">Pattern: {selectedTemplate?.namePattern}</p>
                        <p className="mt-1 text-xs text-slate-500">Description Template: {selectedTemplate?.descriptionTemplate || '-'}</p>
                        <p className="mt-1 text-xs text-slate-500">Groups: {selectedTemplate?.defaultGroups?.map((group) => group.name).join(', ') || '-'}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-[#4A4A4A]">Course Code</label>
                            <input type="text" value={createCourseForm.code} onChange={(event) => setCreateCourseForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))} className={inputClassName} />
                            <InputError message={createCourseErrors.code} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#4A4A4A]">Owner</label>
                            <select value={createCourseForm.ownerId} onChange={(event) => setCreateCourseForm((prev) => ({ ...prev, ownerId: event.target.value }))} className={inputClassName}>
                                <option value="">Select lecturer</option>
                                {lecturers.map((lecturer) => (
                                    <option key={lecturer.id} value={lecturer.id}>{lecturer.name} ({lecturer.email})</option>
                                ))}
                            </select>
                            <InputError message={createCourseErrors.ownerId} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">Course Name</label>
                        <input type="text" value={createCourseForm.name} onChange={(event) => setCreateCourseForm((prev) => ({ ...prev, name: event.target.value }))} className={inputClassName} />
                        <InputError message={createCourseErrors.name} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#4A4A4A]">Course Description</label>
                        <textarea value={createCourseForm.description} onChange={(event) => setCreateCourseForm((prev) => ({ ...prev, description: event.target.value }))} className={`${inputClassName} min-h-28 resize-none`} />
                        <InputError message={createCourseErrors.description} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <SecondaryButton onClick={closeCreateCourseModal} className="flex-1">Cancel</SecondaryButton>
                        <PrimaryButton className="flex-1" disabled={createCourseProcessing}>
                            {createCourseProcessing ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating...</span> : 'Create Course'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
