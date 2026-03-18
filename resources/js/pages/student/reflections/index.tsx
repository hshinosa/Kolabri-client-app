import { Head, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormEvent, useState } from 'react';
import { BookOpen, ChevronDown, Lightbulb, MessageSquare, Pencil, Plus, X } from 'lucide-react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { InputError } from '@/components/ui/input-error';
import { InputLabel } from '@/components/ui/input-label';
import { useStudentNav } from '@/components/navigation/student-nav';
import AppLayout from '@/layouts/app-layout';
import student from '@/routes/student';
import { Course, Reflection } from '@/types';

interface Props {
    reflections: Reflection[];
    courses: Course[];
}

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const bodyTextClass = 'text-sm text-[#6B7280]';

function ReflectionBadge({ label, tone }: { label: string; tone: 'session' | 'weekly' }) {
    const styles = tone === 'session'
        ? {
            background: 'rgba(136,22,28,0.08)',
            color: '#88161c',
            border: '1px solid rgba(136,22,28,0.15)',
        }
        : {
            background: 'rgba(74,74,74,0.08)',
            color: '#4A4A4A',
            border: '1px solid rgba(74,74,74,0.15)',
        };

    return (
        <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={styles}
        >
            {label}
        </span>
    );
}

function SectionHeader({
    icon,
    title,
    count,
    tone,
}: {
    icon: React.ReactNode;
    title: string;
    count: number;
    tone: 'session' | 'weekly';
}) {
    const iconStyles = tone === 'session'
        ? {
            background: 'rgba(136,22,28,0.08)',
            border: '1px solid rgba(136,22,28,0.12)',
            color: '#88161c',
        }
        : {
            background: 'rgba(74,74,74,0.08)',
            border: '1px solid rgba(74,74,74,0.12)',
            color: '#4A4A4A',
        };

    const badgeStyles = tone === 'session'
        ? {
            background: 'rgba(136,22,28,0.08)',
            color: '#88161c',
            border: '1px solid rgba(136,22,28,0.15)',
        }
        : {
            background: 'rgba(74,74,74,0.08)',
            color: '#4A4A4A',
            border: '1px solid rgba(74,74,74,0.15)',
        };

    return (
        <div className="mb-3 flex items-center gap-3">
            <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={iconStyles}
            >
                {icon}
            </div>
            <h3 className="text-lg font-semibold" style={headingStyle}>
                {title}
            </h3>
            <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={badgeStyles}
            >
                {count}
            </span>
        </div>
    );
}

export default function StudentReflectionsIndex({ reflections, courses }: Props) {
    const safeReflections = reflections ?? [];
    const safeCourses = courses ?? [];
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedReflection, setExpandedReflection] = useState<string | null>(null);

    const sessionReflections = safeReflections.filter((r) => r.type === 'session');
    const weeklyReflections = safeReflections.filter((r) => r.type === 'weekly');

    const navItems = useStudentNav('reflections');

    const { data, setData, post, processing, errors, reset } = useForm({
        course_id: '',
        content: '',
        type: 'weekly' as 'weekly',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(student.reflections.store.url(), {
            onSuccess: () => {
                setShowCreateModal(false);
                reset();
            },
        });
    };

    const formatDate = (date?: string) => {
        if (!date) return '';
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return date;

        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const createdAtFor = (reflection: Reflection) => reflection.createdAt ?? reflection.created_at ?? '';

    return (
        <AppLayout title="Refleksi Saya" navItems={navItems}>
            <Head title="Refleksi Saya" />

            <div className="space-y-6">
                <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold" style={headingStyle}>
                                Refleksi Saya
                            </h2>
                            <p className={`mt-1 ${bodyTextClass}`}>
                                Lacak perjalanan pembelajaran Anda melalui refleksi sesi dan mingguan.
                            </p>
                        </div>
                        <PrimaryButton onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4" />
                            Refleksi Mingguan
                        </PrimaryButton>
                    </div>
                </LiquidGlassCard>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                        <div className="flex items-start gap-4">
                            <div
                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                                style={{
                                    background: 'rgba(136,22,28,0.08)',
                                    border: '1px solid rgba(136,22,28,0.12)',
                                }}
                            >
                                <Lightbulb className="h-5 w-5" style={{ color: '#88161c' }} />
                            </div>
                            <div>
                                <p className="text-base font-semibold" style={headingStyle}>
                                    Tentang Refleksi
                                </p>
                                <p className={`mt-2 leading-6 ${bodyTextClass}`}>
                                    Refleksi reguler membantu Anda mengkonsolidasikan pembelajaran dan melacak kemajuan. Di sini Anda
                                    akan melihat <strong>refleksi sesi</strong> yang dibuat saat sesi diskusi ditutup dan
                                    <strong> refleksi mingguan</strong> yang Anda buat sendiri.
                                </p>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </motion.div>

                {safeReflections.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <LiquidGlassCard intensity="medium" className="flex flex-col items-center justify-center py-16 text-center" lightMode={true}>
                            <div
                                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                                style={{
                                    background: 'rgba(136,22,28,0.08)',
                                    border: '1px solid rgba(136,22,28,0.12)',
                                }}
                            >
                                <Pencil className="h-8 w-8" style={{ color: '#88161c' }} />
                            </div>
                            <h3 className="text-lg font-semibold" style={headingStyle}>
                                Belum ada refleksi
                            </h3>
                            <p className="mt-2 max-w-sm text-sm text-[#6B7280]">
                                Mulai refleksi pertama Anda untuk melacak perjalanan pembelajaran dan membangun kebiasaan belajar yang konsisten.
                            </p>
                            <div className="mt-6">
                                <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                    <Plus className="h-4 w-4" />
                                    Tulis Refleksi Mingguan
                                </PrimaryButton>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        {sessionReflections.length > 0 && (
                            <div>
                                <SectionHeader
                                    icon={<MessageSquare className="h-5 w-5" style={{ color: '#88161c' }} />}
                                    title="Refleksi Sesi"
                                    count={sessionReflections.length}
                                    tone="session"
                                />
                                <div className="space-y-4">
                                    {sessionReflections.map((reflection, index) => (
                                        <motion.div
                                            key={reflection.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05, duration: 0.4 }}
                                        >
                                            <LiquidGlassCard intensity="light" className="overflow-hidden" lightMode={true}>
                                                <div
                                                    className="flex cursor-pointer items-center justify-between gap-4 p-5"
                                                    onClick={() => setExpandedReflection(expandedReflection === reflection.id ? null : reflection.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <ReflectionBadge label="Sesi" tone="session" />
                                                        <div>
                                                            <p className="font-semibold" style={headingStyle}>
                                                                {reflection.chatSpace?.name || 'Sesi Diskusi'}
                                                            </p>
                                                            <p className="mt-1 text-sm text-[#6B7280]">
                                                                {reflection.course?.name || 'Kelas Tidak Diketahui'} • {formatDate(createdAtFor(reflection))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <motion.div animate={{ rotate: expandedReflection === reflection.id ? 180 : 0 }}>
                                                        <ChevronDown className="h-5 w-5" style={{ color: '#88161c' }} />
                                                    </motion.div>
                                                </div>
                                                <AnimatePresence>
                                                    {expandedReflection === reflection.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div
                                                                className="border-t p-5"
                                                                style={{
                                                                    borderColor: 'rgba(255,255,255,0.6)',
                                                                    background: 'rgba(255,255,255,0.24)',
                                                                }}
                                                            >
                                                                <p className="whitespace-pre-wrap text-sm leading-6 text-[#4A4A4A]">
                                                                    {reflection.content}
                                                                </p>
                                                                {reflection.ai_feedback && (
                                                                    <div
                                                                        className="mt-4 rounded-2xl p-4"
                                                                        style={{
                                                                            background: 'rgba(136,22,28,0.06)',
                                                                            border: '1px solid rgba(136,22,28,0.12)',
                                                                        }}
                                                                    >
                                                                        <div className="mb-2 flex items-center gap-2">
                                                                            <Lightbulb className="h-4 w-4" style={{ color: '#88161c' }} />
                                                                            <span className="text-sm font-semibold" style={headingStyle}>
                                                                                Umpan Balik AI
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm leading-6 text-[#6B7280]">
                                                                            {reflection.ai_feedback}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </LiquidGlassCard>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {weeklyReflections.length > 0 && (
                            <div>
                                <SectionHeader
                                    icon={<BookOpen className="h-5 w-5" style={{ color: '#4A4A4A' }} />}
                                    title="Refleksi Mingguan"
                                    count={weeklyReflections.length}
                                    tone="weekly"
                                />
                                <div className="space-y-4">
                                    {weeklyReflections.map((reflection, index) => (
                                        <motion.div
                                            key={reflection.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05, duration: 0.4 }}
                                        >
                                            <LiquidGlassCard intensity="light" className="overflow-hidden" lightMode={true}>
                                                <div
                                                    className="flex cursor-pointer items-center justify-between gap-4 p-5"
                                                    onClick={() => setExpandedReflection(expandedReflection === reflection.id ? null : reflection.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <ReflectionBadge label="Mingguan" tone="weekly" />
                                                        <div>
                                                            <p className="font-semibold" style={headingStyle}>
                                                                {reflection.course?.name || 'Kelas Tidak Diketahui'}
                                                            </p>
                                                            <p className="mt-1 text-sm text-[#6B7280]">
                                                                {formatDate(createdAtFor(reflection))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <motion.div animate={{ rotate: expandedReflection === reflection.id ? 180 : 0 }}>
                                                        <ChevronDown className="h-5 w-5" style={{ color: '#4A4A4A' }} />
                                                    </motion.div>
                                                </div>
                                                <AnimatePresence>
                                                    {expandedReflection === reflection.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div
                                                                className="border-t p-5"
                                                                style={{
                                                                    borderColor: 'rgba(255,255,255,0.6)',
                                                                    background: 'rgba(255,255,255,0.24)',
                                                                }}
                                                            >
                                                                <p className="whitespace-pre-wrap text-sm leading-6 text-[#4A4A4A]">
                                                                    {reflection.content}
                                                                </p>
                                                                {reflection.ai_feedback && (
                                                                    <div
                                                                        className="mt-4 rounded-2xl p-4"
                                                                        style={{
                                                                            background: 'rgba(136,22,28,0.06)',
                                                                            border: '1px solid rgba(136,22,28,0.12)',
                                                                        }}
                                                                    >
                                                                        <div className="mb-2 flex items-center gap-2">
                                                                            <Lightbulb className="h-4 w-4" style={{ color: '#88161c' }} />
                                                                            <span className="text-sm font-semibold" style={headingStyle}>
                                                                                Umpan Balik AI
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm leading-6 text-[#6B7280]">
                                                                            {reflection.ai_feedback}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </LiquidGlassCard>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showCreateModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-lg p-6" lightMode={true}>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold" style={headingStyle}>
                                                Refleksi Mingguan Baru
                                            </h3>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                Refleksikan pengalaman pembelajaran mingguan Anda.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-white/50 hover:text-[#4A4A4A]"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                        <div>
                                            <InputLabel htmlFor="course_id" required>
                                                Kelas
                                            </InputLabel>
                                            <select
                                                id="course_id"
                                                value={data.course_id}
                                                onChange={(e) => setData('course_id', e.target.value)}
                                                className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30"
                                            >
                                                <option value="">Pilih kelas</option>
                                                {safeCourses.map((course) => (
                                                    <option key={course.id} value={course.id}>
                                                        {course.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.course_id} />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="content" required>
                                                Refleksi
                                            </InputLabel>
                                            <textarea
                                                id="content"
                                                value={data.content}
                                                onChange={(e) => setData('content', e.target.value)}
                                                className="mt-1 block min-h-[150px] w-full rounded-2xl border-0 bg-white/60 px-4 py-3 text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30"
                                                placeholder="Apa yang Anda pelajari hari ini? Tantangan apa yang Anda hadapi? Bagaimana Anda mengatasinya?"
                                                rows={5}
                                            />
                                            <InputError message={errors.content} />
                                            <p className="mt-2 text-xs text-[#6B7280]">
                                                {data.content.length}/1000 karakter
                                            </p>
                                        </div>

                                        <div
                                            className="rounded-2xl p-4"
                                            style={{
                                                background: 'rgba(255,255,255,0.35)',
                                                border: '1px solid rgba(255,255,255,0.5)',
                                            }}
                                        >
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4A4A4A]">
                                                Prompt refleksi mingguan
                                            </p>
                                            <ul className="space-y-1 text-xs leading-5 text-[#6B7280]">
                                                <li>• Apa pencapaian pembelajaran terbesar minggu ini?</li>
                                                <li>• Konsep apa yang masih membingungkan?</li>
                                                <li>• Bagaimana kolaborasi dengan tim berkontribusi pada pemahaman saya?</li>
                                                <li>• Apa yang akan saya fokuskan minggu depan?</li>
                                            </ul>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <SecondaryButton onClick={() => setShowCreateModal(false)} className="flex-1">
                                                Batal
                                            </SecondaryButton>
                                            <PrimaryButton
                                                disabled={processing || !data.content.trim() || !data.course_id}
                                                className="flex-1"
                                            >
                                                {processing ? 'Menyimpan...' : 'Simpan Refleksi'}
                                            </PrimaryButton>
                                        </div>
                                    </form>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
