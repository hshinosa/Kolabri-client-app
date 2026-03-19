import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { FormEvent, useMemo, useRef, useState } from 'react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { InputError } from '@/components/ui/input-error';
import AppLayout from '@/layouts/app-layout';
import { Course, KnowledgeBase, VectorStatus } from '@/types';
import lecturer from '@/routes/lecturer';

const ACCEPTED_FILE_TYPES = [
    '.pdf',
    '.docx',
    '.pptx',
    '.txt',
    '.md',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.zip',
];

const SUPPORTED_FORMAT_LABEL = 'PDF, DOCX, PPTX, TXT, MD, PNG, JPG, JPEG, GIF, WEBP, ZIP';

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / 1024 ** i;
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const STATUS_LABELS: Record<VectorStatus, string> = {
    pending: 'Menunggu',
    processing: 'Memproses',
    ready: 'Siap',
    failed: 'Gagal',
    skipped: 'Dilewati',
};

interface Props {
    course: Course & {
        join_code: string;
        knowledge_base: KnowledgeBase[];
    };
}

export default function ShowCourse({ course }: Props) {
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<{
        files: File[];
        extract_images: boolean;
        perform_ocr: boolean;
    }>({
        files: [],
        extract_images: true,
        perform_ocr: false,
    });

    const navItems = useLecturerNav('course-detail', { courseId: course.id });

    const copyJoinCode = () => {
        navigator.clipboard.writeText(course.join_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        setData('files', files);
        if (files.length > 0) {
            clearErrors('files');
        }
    };

    const removeSelectedFile = (index: number) => {
        const updated = [...data.files];
        updated.splice(index, 1);
        setData('files', updated);
    };

    const handleUpload = (e: FormEvent) => {
        e.preventDefault();
        if (data.files.length === 0) {
            return;
        }

        post(lecturer.courses.knowledgeBase.store.url({ course: course.id }), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const getStatusColor = (status: VectorStatus) => {
        switch (status) {
            case 'ready':
                return 'status-green';
            case 'processing':
            case 'pending':
                return 'status-yellow';
            case 'failed':
                return 'status-red';
            case 'skipped':
                return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/60 dark:text-zinc-200';
            default:
                return 'bg-zinc-100 text-zinc-800';
        }
    };

    const knowledgeBaseStats = useMemo(() => {
        const files = course.knowledge_base || [];
        return {
            total: files.length,
            ready: files.filter((f) => f.vector_status === 'ready').length,
            processing: files.filter((f) => f.vector_status === 'processing' || f.vector_status === 'pending').length,
            failed: files.filter((f) => f.vector_status === 'failed').length,
            skipped: files.filter((f) => f.vector_status === 'skipped').length,
        };
    }, [course.knowledge_base]);

    const readyKnowledgeBase = useMemo(() => {
        return (course.knowledge_base || []).filter((file) => file.vector_status === 'ready');
    }, [course.knowledge_base]);

    const hiddenKnowledgeBaseCount = Math.max((course.knowledge_base?.length || 0) - readyKnowledgeBase.length, 0);
    const hasAnyKnowledgeFiles = (course.knowledge_base?.length || 0) > 0;

    const knowledgeStatusLabel = (() => {
        if (knowledgeBaseStats.total === 0) {
            return 'Belum diunggah';
        }
        if (knowledgeBaseStats.processing > 0) {
            return '⏳ Sedang diproses';
        }
        if (knowledgeBaseStats.failed > 0) {
            return '⚠️ Perlu perhatian';
        }
        if (knowledgeBaseStats.skipped > 0) {
            return '✓ Selesai (dengan berkas dilewati)';
        }
        return '✓ Semua siap';
    })();

    return (
        <AppLayout title={course.name} navItems={navItems}>
            <Head title={course.name} />

            <div className="space-y-6">
                {/* Course Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-sm font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                                    {course.code}
                                </span>
                            </div>
                            <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {course.name}
                            </h2>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href={lecturer.analytics.index.url({ course: course.id })}
                                className="btn-primary flex items-center gap-2"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Analytics
                            </Link>
                            <Link
                                href={lecturer.groups.index.url({ course: course.id })}
                                className="btn-secondary"
                            >
                                Kelola Grup
                            </Link>
                        </div>
                    </div>

                    {/* Join Code */}
                    <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Kode Bergabung Siswa
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <code className="rounded bg-white px-4 py-2 font-mono text-2xl font-bold tracking-wider text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                {course.join_code}
                            </code>
                            <button
                                onClick={copyJoinCode}
                                className="btn-secondary"
                            >
                                {copied ? 'Disalin!' : 'Salin'}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                            Bagikan kode ini dengan siswa untuk memungkinkan mereka bergabung dengan kelas
                        </p>
                    </div>
                </motion.div>

                {/* Knowledge Base Upload */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-6"
                >
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Basis Pengetahuan
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Unggah materi kelas (PDF, DOCX, PPTX, TXT, gambar, atau ZIP) untuk chatbot AI.
                    </p>

                    {/* Upload Form */}
                    <form onSubmit={handleUpload} className="mt-4">
                        <div className="space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_FILE_TYPES.join(',')}
                                onChange={handleFilesChange}
                                className="flex-1 text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100 dark:text-zinc-400 dark:file:bg-primary-900/30 dark:file:text-primary-300"
                            />
                            <p className="text-xs text-zinc-500">
                                Maks: 50MB per file (ZIP). Format didukung: {SUPPORTED_FORMAT_LABEL}.
                            </p>
                            <InputError message={errors.files || errors.file} />
                        </div>

                        {data.files.length > 0 && (
                            <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                    Berkas siap unggah ({data.files.length})
                                </p>
                                <ul className="mt-3 space-y-2">
                                    {data.files.map((file, index) => (
                                        <li key={`${file.name}-${index}`} className="flex items-center justify-between text-sm">
                                            <div>
                                                <p className="font-medium text-zinc-900 dark:text-zinc-100">{file.name}</p>
                                                <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeSelectedFile(index)}
                                                className="text-xs font-medium text-red-500 hover:text-red-600"
                                            >
                                                Hapus
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    checked={data.extract_images}
                                    onChange={(event) => setData('extract_images', event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                    Ekstrak gambar
                                    <span className="block text-xs text-zinc-500">Konversi slide atau materi visual secara otomatis.</span>
                                </span>
                            </label>

                            <label className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    checked={data.perform_ocr}
                                    onChange={(event) => setData('perform_ocr', event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                    Aktifkan OCR
                                    <span className="block text-xs text-zinc-500">Gunakan untuk dokumen hasil pemindaian bertulisan tangan.</span>
                                </span>
                            </label>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-zinc-500">
                                OCR menambah waktu proses dan resource. Aktifkan hanya saat diperlukan.
                            </p>
                            <button
                                type="submit"
                                disabled={data.files.length === 0 || processing}
                                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Mengunggah...
                                    </span>
                                ) : (
                                    'Unggah Berkas'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Uploaded Files List */}
                    {hasAnyKnowledgeFiles && (
                        <div className="mt-6">
                            <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                File yang Siap Dipakai
                            </h4>
                            {readyKnowledgeBase.length > 0 ? (
                                <div className="space-y-2">
                                    {readyKnowledgeBase.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                        {file.file_name}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {formatFileSize(file.file_size)} • Diunggah {new Date(file.uploaded_at).toLocaleDateString()}
                                                        {file.processed_at && (
                                                            <span> • Diproses {new Date(file.processed_at).toLocaleDateString()}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(file.vector_status)}`}>
                                                {STATUS_LABELS[file.vector_status]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500">
                                    Belum ada berkas yang siap digunakan. {hiddenKnowledgeBaseCount > 0 ? `Menunggu ${hiddenKnowledgeBaseCount} berkas diproses.` : ''}
                                </p>
                            )}
                            {hiddenKnowledgeBaseCount > 0 && readyKnowledgeBase.length > 0 && (
                                <p className="mt-3 text-xs text-zinc-500">
                                    Menampilkan berkas yang telah diproses. {hiddenKnowledgeBaseCount} berkas lain masih dalam antrian atau gagal diproses.
                                </p>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Quick Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="card p-6"
                    >
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Total Siswa
                        </p>
                        <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            {course.students_count || 0}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="card p-6"
                    >
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Grup
                        </p>
                        <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            {course.groups_count || 0}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="card p-6"
                    >
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Status Basis Pengetahuan
                        </p>
                        <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {knowledgeStatusLabel}
                        </p>
                        {knowledgeBaseStats.total > 0 && (
                            <p className="mt-1 text-xs text-zinc-500">
                                Siap: {knowledgeBaseStats.ready} • Memproses: {knowledgeBaseStats.processing}
                                {knowledgeBaseStats.failed > 0 && ` • Gagal: ${knowledgeBaseStats.failed}`}
                                {knowledgeBaseStats.skipped > 0 && ` • Dilewati: ${knowledgeBaseStats.skipped}`}
                            </p>
                        )}
                    </motion.div>
                </div>
            </div>
        </AppLayout>
    );
}
