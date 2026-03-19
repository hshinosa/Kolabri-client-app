import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    CheckCircle2,
    Clock3,
    Copy,
    Files,
    FolderKanban,
    Sparkles,
    UploadCloud,
    Users,
} from 'lucide-react';
import { ChangeEvent, CSSProperties, FormEvent, useMemo, useRef, useState } from 'react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { LiquidGlassCard, OrganicBlob, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { InputError } from '@/components/ui/input-error';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course, KnowledgeBase, VectorStatus } from '@/types';

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

const STATUS_LABELS: Record<VectorStatus, string> = {
    pending: 'Menunggu',
    processing: 'Memproses',
    ready: 'Siap',
    failed: 'Gagal',
    skipped: 'Dilewati',
};

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const bodyTextClass = 'text-sm text-[#6B7280]';

const brandChipStyle = {
    background: 'rgba(136,22,28,0.08)',
    color: '#88161c',
    border: '1px solid rgba(136,22,28,0.15)',
} as const;

const neutralChipStyle = {
    background: 'rgba(74,74,74,0.08)',
    color: '#4A4A4A',
    border: '1px solid rgba(74,74,74,0.12)',
} as const;

const glassPanelStyle = {
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.65)',
} as const;

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / 1024 ** index;
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${sizes[index]}`;
};

const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const getStatusStyle = (status: VectorStatus): CSSProperties => {
    switch (status) {
        case 'ready':
            return {
                background: 'rgba(34,197,94,0.10)',
                color: '#166534',
                border: '1px solid rgba(34,197,94,0.18)',
            };
        case 'processing':
        case 'pending':
            return {
                background: 'rgba(245,158,11,0.10)',
                color: '#92400e',
                border: '1px solid rgba(245,158,11,0.18)',
            };
        case 'failed':
            return {
                background: 'rgba(239,68,68,0.10)',
                color: '#b91c1c',
                border: '1px solid rgba(239,68,68,0.18)',
            };
        case 'skipped':
            return {
                background: 'rgba(107,114,128,0.10)',
                color: '#4b5563',
                border: '1px solid rgba(107,114,128,0.18)',
            };
        default:
            return brandChipStyle;
    }
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

    const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
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

    const handleUpload = (event: FormEvent) => {
        event.preventDefault();
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

    const knowledgeBaseStats = useMemo(() => {
        const files = course.knowledge_base || [];
        return {
            total: files.length,
            ready: files.filter((file) => file.vector_status === 'ready').length,
            processing: files.filter((file) => file.vector_status === 'processing' || file.vector_status === 'pending').length,
            failed: files.filter((file) => file.vector_status === 'failed').length,
            skipped: files.filter((file) => file.vector_status === 'skipped').length,
        };
    }, [course.knowledge_base]);

    const readyKnowledgeBase = useMemo(() => {
        return (course.knowledge_base || []).filter((file) => file.vector_status === 'ready');
    }, [course.knowledge_base]);

    const hiddenKnowledgeBaseCount = Math.max((course.knowledge_base?.length || 0) - readyKnowledgeBase.length, 0);
    const hasAnyKnowledgeFiles = (course.knowledge_base?.length || 0) > 0;

    const knowledgeStatusLabel = (() => {
        if (knowledgeBaseStats.total === 0) {
            return 'Belum ada materi';
        }
        if (knowledgeBaseStats.processing > 0) {
            return 'Sedang diproses';
        }
        if (knowledgeBaseStats.failed > 0) {
            return 'Perlu perhatian';
        }
        if (knowledgeBaseStats.skipped > 0) {
            return 'Selesai dengan pengecualian';
        }
        return 'Semua siap';
    })();

    const knowledgeStatusStyle: CSSProperties = knowledgeBaseStats.total === 0
        ? neutralChipStyle
        : knowledgeBaseStats.processing > 0
          ? getStatusStyle('processing')
          : knowledgeBaseStats.failed > 0
            ? getStatusStyle('failed')
            : knowledgeBaseStats.skipped > 0
              ? getStatusStyle('skipped')
              : getStatusStyle('ready');

    return (
        <AppLayout title={course.name} navItems={navItems}>
            <Head title={course.name} />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={300} />
                <OrganicBlob className="top-36 -right-16" delay={-5} color="rgba(136, 22, 28, 0.03)" size={240} />

                <div className="relative space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <LiquidGlassCard intensity="medium" className="p-6 sm:p-8" lightMode={true}>
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={brandChipStyle}>
                                            {course.code}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={knowledgeStatusStyle}>
                                            <Sparkles className="h-3.5 w-3.5" />
                                            {knowledgeStatusLabel}
                                        </span>
                                    </div>

                                    <h1 className="mt-3 text-2xl font-bold sm:text-3xl" style={headingStyle}>
                                        {course.name}
                                    </h1>
                                    <p className={`mt-2 max-w-2xl ${bodyTextClass}`}>
                                        Pusat kendali kelas untuk mengelola materi, memantau kesiapan basis pengetahuan, dan
                                        mengarahkan kolaborasi mahasiswa tanpa mengubah alur kerja yang sudah berjalan.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                                    <SecondaryButton href={lecturer.groups.index.url({ course: course.id })} className="min-w-[170px]">
                                        <FolderKanban className="h-4 w-4" />
                                        Kelola Grup
                                    </SecondaryButton>
                                    <PrimaryButton href={lecturer.analytics.index.url({ course: course.id })} className="min-w-[170px]">
                                        <BarChart3 className="h-4 w-4" />
                                        Analytics
                                    </PrimaryButton>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                label: 'Total Mahasiswa',
                                value: course.students_count || 0,
                                detail: 'Peserta aktif di kelas ini',
                                icon: Users,
                                color: '#88161c',
                            },
                            {
                                label: 'Grup Aktif',
                                value: course.groups_count || 0,
                                detail: 'Kelompok kolaborasi mahasiswa',
                                icon: FolderKanban,
                                color: '#4A4A4A',
                            },
                            {
                                label: 'Materi Siap Pakai',
                                value: knowledgeBaseStats.ready,
                                detail: `${knowledgeBaseStats.total} total file basis pengetahuan`,
                                icon: CheckCircle2,
                                color: '#166534',
                            },
                            {
                                label: 'Dalam Proses',
                                value: knowledgeBaseStats.processing,
                                detail:
                                    knowledgeBaseStats.failed > 0
                                        ? `${knowledgeBaseStats.failed} file perlu perhatian`
                                        : 'Pemrosesan materi terbaru',
                                icon: Clock3,
                                color: '#92400e',
                            },
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08 * (index + 1) }}
                            >
                                <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-[#6B7280]">{stat.label}</p>
                                            <p className="mt-2 text-3xl font-light" style={headingStyle}>
                                                {stat.value}
                                            </p>
                                            <p className="mt-1 text-xs text-[#6B7280]">{stat.detail}</p>
                                        </div>
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                            style={{
                                                background: `${stat.color}12`,
                                                border: `1px solid ${stat.color}20`,
                                            }}
                                        >
                                            <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                                        </div>
                                    </div>
                                </LiquidGlassCard>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                    >
                        <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-4">
                                    <div
                                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                        style={{
                                            background: 'rgba(136,22,28,0.08)',
                                            border: '1px solid rgba(136,22,28,0.12)',
                                        }}
                                    >
                                        <BookOpen className="h-6 w-6" style={{ color: '#88161c' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#6B7280]">Kode bergabung mahasiswa</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-3">
                                            <span
                                                className="rounded-full px-5 py-2 font-mono text-2xl font-semibold tracking-[0.25em]"
                                                style={{
                                                    background: 'rgba(255,255,255,0.65)',
                                                    border: '1px solid rgba(255,255,255,0.8)',
                                                    color: '#88161c',
                                                }}
                                            >
                                                {course.join_code}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={copyJoinCode}
                                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all"
                                                style={glassPanelStyle}
                                            >
                                                <Copy className="h-4 w-4" />
                                                {copied ? 'Disalin!' : 'Salin kode'}
                                            </button>
                                        </div>
                                        <p className={`mt-2 ${bodyTextClass}`}>
                                            Bagikan kode ini kepada mahasiswa agar mereka dapat masuk ke kelas yang tepat.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
                                    <div className="rounded-2xl p-4" style={glassPanelStyle}>
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Siap dipakai</p>
                                        <p className="mt-2 text-xl font-semibold" style={headingStyle}>
                                            {knowledgeBaseStats.ready} file
                                        </p>
                                    </div>
                                    <div className="rounded-2xl p-4" style={glassPanelStyle}>
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Menunggu / gagal</p>
                                        <p className="mt-2 text-xl font-semibold" style={headingStyle}>
                                            {knowledgeBaseStats.processing + knowledgeBaseStats.failed + knowledgeBaseStats.skipped} file
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6 sm:p-8" lightMode={true}>
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="max-w-2xl">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-12 w-12 items-center justify-center rounded-2xl"
                                            style={{
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.12)',
                                            }}
                                        >
                                            <UploadCloud className="h-6 w-6" style={{ color: '#88161c' }} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold" style={headingStyle}>
                                                Basis Pengetahuan
                                            </h2>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                Unggah materi kelas untuk memperkaya jawaban chatbot AI tanpa mengubah alur upload yang
                                                sudah ada.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-full px-3 py-1 text-xs font-medium" style={knowledgeStatusStyle}>
                                    {knowledgeStatusLabel}
                                </div>
                            </div>

                            <form onSubmit={handleUpload} className="mt-6 space-y-5">
                                <div className="rounded-[28px] p-5" style={glassPanelStyle}>
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                                style={{
                                                    background: 'rgba(136,22,28,0.08)',
                                                    border: '1px solid rgba(136,22,28,0.12)',
                                                }}
                                            >
                                                <Files className="h-6 w-6" style={{ color: '#88161c' }} />
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold" style={headingStyle}>
                                                    Unggah materi baru
                                                </p>
                                                <p className={`mt-1 ${bodyTextClass}`}>
                                                    Maksimal 50MB per file. Format didukung: {SUPPORTED_FORMAT_LABEL}.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                            {data.files.length > 0 ? `${data.files.length} file dipilih` : 'Belum ada file dipilih'}
                                        </div>
                                    </div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept={ACCEPTED_FILE_TYPES.join(',')}
                                        onChange={handleFilesChange}
                                        className="mt-5 block w-full text-sm text-[#6B7280] file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2.5 file:text-sm file:font-medium"
                                        style={{
                                            color: '#6B7280',
                                        }}
                                    />
                                    <style>{`input[type="file"]::file-selector-button { background: rgba(136,22,28,0.10); color: #88161c; }`}</style>
                                    <InputError message={errors.files || errors.file} />
                                </div>

                                {data.files.length > 0 && (
                                    <div className="rounded-[28px] p-5" style={glassPanelStyle}>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-medium" style={headingStyle}>
                                                Berkas siap diunggah
                                            </p>
                                            <span className="rounded-full px-3 py-1 text-xs font-medium" style={brandChipStyle}>
                                                {data.files.length} item
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                            {data.files.map((file, index) => (
                                                <div
                                                    key={`${file.name}-${index}`}
                                                    className="flex items-start justify-between gap-3 rounded-2xl p-4"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.55)',
                                                        border: '1px solid rgba(255,255,255,0.7)',
                                                    }}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium" style={{ color: '#4A4A4A' }}>
                                                            {file.name}
                                                        </p>
                                                        <p className="mt-1 text-xs text-[#6B7280]">{formatFileSize(file.size)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSelectedFile(index)}
                                                        className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                                                        style={{
                                                            background: 'rgba(239,68,68,0.10)',
                                                            color: '#b91c1c',
                                                            border: '1px solid rgba(239,68,68,0.16)',
                                                        }}
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <label className="flex items-start gap-3 rounded-[28px] p-5" style={glassPanelStyle}>
                                        <input
                                            type="checkbox"
                                            checked={data.extract_images}
                                            onChange={(event) => setData('extract_images', event.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span>
                                            <span className="block text-sm font-medium" style={{ color: '#4A4A4A' }}>
                                                Ekstrak gambar
                                            </span>
                                            <span className="mt-1 block text-sm text-[#6B7280]">
                                                Konversi slide atau materi visual secara otomatis untuk memperkaya konteks AI.
                                            </span>
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 rounded-[28px] p-5" style={glassPanelStyle}>
                                        <input
                                            type="checkbox"
                                            checked={data.perform_ocr}
                                            onChange={(event) => setData('perform_ocr', event.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span>
                                            <span className="block text-sm font-medium" style={{ color: '#4A4A4A' }}>
                                                Aktifkan OCR
                                            </span>
                                            <span className="mt-1 block text-sm text-[#6B7280]">
                                                Gunakan untuk dokumen hasil pindaian atau materi dengan teks yang perlu dibaca ulang.
                                            </span>
                                        </span>
                                    </label>
                                </div>

                                <div className="flex flex-col gap-4 rounded-[28px] p-5 lg:flex-row lg:items-center lg:justify-between" style={glassPanelStyle}>
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                                            style={{
                                                background: 'rgba(245,158,11,0.10)',
                                                border: '1px solid rgba(245,158,11,0.16)',
                                            }}
                                        >
                                            <AlertTriangle className="h-5 w-5" style={{ color: '#92400e' }} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>
                                                Catatan pemrosesan
                                            </p>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                OCR menambah waktu proses dan penggunaan resource. Aktifkan hanya saat benar-benar diperlukan.
                                            </p>
                                        </div>
                                    </div>

                                    <PrimaryButton disabled={data.files.length === 0 || processing} className="justify-center">
                                        {processing ? 'Mengunggah...' : 'Unggah Berkas'}
                                    </PrimaryButton>
                                </div>
                            </form>

                            <div className="mt-8">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold" style={headingStyle}>
                                            Materi yang siap digunakan AI
                                        </h3>
                                        <p className={`mt-1 ${bodyTextClass}`}>
                                            Menampilkan file yang telah selesai diproses dan siap dijadikan referensi jawaban.
                                        </p>
                                    </div>
                                    {hasAnyKnowledgeFiles && (
                                        <span className="rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                            {readyKnowledgeBase.length} siap • {hiddenKnowledgeBaseCount} tersembunyi
                                        </span>
                                    )}
                                </div>

                                {!hasAnyKnowledgeFiles ? (
                                    <div className="mt-5 rounded-[28px] px-6 py-10 text-center" style={glassPanelStyle}>
                                        <div
                                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                                            style={{
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.12)',
                                            }}
                                        >
                                            <Files className="h-8 w-8" style={{ color: '#88161c' }} />
                                        </div>
                                        <h4 className="mt-4 text-lg font-semibold" style={headingStyle}>
                                            Belum ada materi yang diunggah
                                        </h4>
                                        <p className={`mx-auto mt-2 max-w-md ${bodyTextClass}`}>
                                            Tambahkan materi kelas untuk mulai membangun basis pengetahuan yang dapat dipakai chatbot AI.
                                        </p>
                                    </div>
                                ) : readyKnowledgeBase.length > 0 ? (
                                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                                        {readyKnowledgeBase.map((file) => (
                                            <div key={file.id} className="rounded-[28px] p-5" style={glassPanelStyle}>
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
                                                                style={{
                                                                    background: 'rgba(136,22,28,0.08)',
                                                                    border: '1px solid rgba(136,22,28,0.12)',
                                                                }}
                                                            >
                                                                <Files className="h-5 w-5" style={{ color: '#88161c' }} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-semibold" style={{ color: '#4A4A4A' }}>
                                                                    {file.file_name}
                                                                </p>
                                                                <p className="mt-1 text-xs text-[#6B7280]">
                                                                    {formatFileSize(file.file_size)} • Diunggah {formatDate(file.uploaded_at)}
                                                                </p>
                                                                {file.processed_at && (
                                                                    <p className="mt-1 text-xs text-[#6B7280]">
                                                                        Diproses {formatDate(file.processed_at)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={getStatusStyle(file.vector_status)}>
                                                        {STATUS_LABELS[file.vector_status]}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-[28px] px-6 py-10 text-center" style={glassPanelStyle}>
                                        <div
                                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                                            style={{
                                                background: 'rgba(245,158,11,0.10)',
                                                border: '1px solid rgba(245,158,11,0.16)',
                                            }}
                                        >
                                            <Clock3 className="h-8 w-8" style={{ color: '#92400e' }} />
                                        </div>
                                        <h4 className="mt-4 text-lg font-semibold" style={headingStyle}>
                                            Materi masih diproses
                                        </h4>
                                        <p className={`mx-auto mt-2 max-w-md ${bodyTextClass}`}>
                                            Belum ada file yang siap digunakan.{' '}
                                            {hiddenKnowledgeBaseCount > 0
                                                ? `${hiddenKnowledgeBaseCount} file sedang menunggu pemrosesan atau memerlukan perhatian.`
                                                : 'Silakan tunggu beberapa saat lalu muat ulang halaman.'}
                                        </p>
                                    </div>
                                )}

                                {hiddenKnowledgeBaseCount > 0 && readyKnowledgeBase.length > 0 && (
                                    <p className="mt-4 text-xs text-[#6B7280]">
                                        Menampilkan file yang telah siap dipakai. {hiddenKnowledgeBaseCount} file lain masih dalam antrian,
                                        dilewati, atau gagal diproses.
                                    </p>
                                )}
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </div>
        </AppLayout>
    );
}
