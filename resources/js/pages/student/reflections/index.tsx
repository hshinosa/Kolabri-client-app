import { Head, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormEvent, useState, useMemo, useEffect, useCallback } from 'react';
import { BookOpen, ChevronDown, Lightbulb, MessageSquare, Pencil, Plus, X } from 'lucide-react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { InputError } from '@/components/ui/input-error';
import { InputLabel } from '@/components/ui/input-label';
import { FormModal } from '@/components/ui/FormModal';
import { useStudentNav } from '@/components/navigation/student-nav';
import AppLayout from '@/layouts/app-layout';
import student from '@/routes/student';
import Breadcrumbs from '@/components/dashboard/Breadcrumbs';
import { Course, Reflection } from '@/types';
import { Skeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/EmptyState';


import { ReflectionSearchBar } from './components/ReflectionSearchBar';
import { FilterChips } from './components/FilterChips';

interface Props {
    reflections: Reflection[];
    courses: Course[];
}

function ReflectionBadge({ label, tone }: { label: string; tone: 'session' | 'weekly' }) {
    const styles = tone === 'session'
        ? {
            background: 'rgba(136,22,28,0.08)',
            color: 'var(--color-brand-primary)',
            border: '1px solid rgba(136,22,28,0.15)',
        }
        : {
            background: 'rgba(74,74,74,0.08)',
            color: 'var(--color-brand-dark)',
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
            color: 'var(--color-brand-primary)',
        }
        : {
            background: 'rgba(74,74,74,0.08)',
            border: '1px solid rgba(74,74,74,0.12)',
            color: 'var(--color-brand-dark)',
        };

    const badgeStyles = tone === 'session'
        ? {
            background: 'rgba(136,22,28,0.08)',
            color: 'var(--color-brand-primary)',
            border: '1px solid rgba(136,22,28,0.15)',
        }
        : {
            background: 'rgba(74,74,74,0.08)',
            color: 'var(--color-brand-dark)',
            border: '1px solid rgba(74,74,74,0.15)',
        };

    return (
        <div className="mb-3 flex items-center gap-3">
            <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={iconStyles}
            >
                {icon}
            </div>
            <h3 className="text-base font-semibold font-sans text-brand-dark">
                {title}
            </h3>
            <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={badgeStyles}
            >
                {count}
            </span>
        </div>
    );
}

function highlightText(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? (
            <mark key={i} className="rounded bg-yellow-200/60 px-0.5">{part}</mark>
        ) : part
    );
}

export default function StudentReflectionsIndex({ reflections, courses }: Props) {
    const safeReflections = reflections ?? [];
    const safeCourses = courses ?? [];
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedReflection, setExpandedReflection] = useState<string | null>(null);

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const navItems = useStudentNav('reflections');

    useEffect(() => {
        const timer = setTimeout(() => setIsInitialLoading(false), 300);
        return () => clearTimeout(timer);
    }, []);

    // Draft dari chat AI ("Jadikan dasar refleksi"): buka form dgn isi awal —
    // mahasiswa edit dulu sebelum submit, refleksi tetap milik mereka.
    useEffect(() => {
        const draft = sessionStorage.getItem('kolabri_reflection_draft');
        if (draft) {
            sessionStorage.removeItem('kolabri_reflection_draft');
            setData('content', draft);
            setShowCreateModal(true);
        }
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        course_id: '',
        content: '',
        type: 'weekly' as const,
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        const from = params.get('from');
        const to = params.get('to');
        if (q) setSearchQuery(q);
        if (from) setDateFrom(from);
        if (to) setDateTo(to);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
        const qs = params.toString();
        const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState(null, '', url);
    }, [searchQuery, dateFrom, dateTo]);


    const filteredReflections = useMemo(() => {
        let result = safeReflections;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((r) =>
                r.content.toLowerCase().includes(q) ||
                (r.sessionDiscussion?.name ?? '').toLowerCase().includes(q) ||
                (r.course?.name ?? '').toLowerCase().includes(q)
            );
        }



        if (dateFrom) {
            result = result.filter((r) => {
                const d = r.createdAt ?? r.created_at ?? '';
                return d >= dateFrom;
            });
        }
        if (dateTo) {
            result = result.filter((r) => {
                const d = r.createdAt ?? r.created_at ?? '';
                return d <= dateTo + 'T23:59:59';
            });
        }
        return result;
    }, [safeReflections, searchQuery, dateFrom, dateTo]);

    const sessionReflections = useMemo(
        () => filteredReflections.filter((r) => r.type === 'session'),
        [filteredReflections],
    );
    const weeklyReflections = useMemo(
        () => filteredReflections.filter((r) => r.type === 'weekly'),
        [filteredReflections],
    );

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

    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setSearchQuery('');
    };

    const hasActiveFilters = searchQuery || dateFrom || dateTo;

    const breadcrumbItems = [{ label: 'Refleksi Saya' }];

    return (
        <AppLayout title="Refleksi Saya" navItems={navItems}>
            <Head title="Refleksi Saya" />
            <Breadcrumbs items={breadcrumbItems} />

            {isInitialLoading ? (
                <div className="space-y-6">
                    <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="mt-2 h-4 w-72" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32 rounded-lg" />
                        <Skeleton className="h-10 w-28 rounded-lg" />
                        <Skeleton className="h-10 w-28 rounded-lg" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-20 rounded-full" />
                        <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.6)' }}>
                                <Skeleton className="h-5 w-32 rounded-full" />
                                <Skeleton className="mt-3 h-4 w-full" />
                                <Skeleton className="mt-2 h-4 w-3/4" />
                                <div className="mt-3 flex gap-2">
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
            <div className="space-y-6">
                <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold font-sans text-brand-dark">
                                Refleksi Saya
                            </h2>
                            <p className="mt-1 text-sm text-brand-muted-dark">
                                Lacak perjalanan pembelajaran Anda melalui refleksi sesi dan mingguan.
                            </p>
                        </div>

                    </div>
                </LiquidGlassCard>





                <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                    <div className="space-y-3">
                        <ReflectionSearchBar
                            value={searchQuery}
                            onChange={setSearchQuery}
                            onClear={() => setSearchQuery('')}
                        />
                        <FilterChips
                            dateFrom={dateFrom}
                            dateTo={dateTo}
                            onDateFromChange={setDateFrom}
                            onDateToChange={setDateTo}
                            onClearAll={clearFilters}
                        />
                    </div>
                </LiquidGlassCard>

                        {hasActiveFilters && filteredReflections.length === 0 ? (
                            <EmptyState
                                icon={Pencil}
                                title="Tidak ada refleksi yang cocok"
                                description="Coba ubah kata kunci pencarian atau filter yang digunakan"
                                action={
                                    <SecondaryButton onClick={clearFilters}>
                                        Hapus Filter
                                    </SecondaryButton>
                                }
                            />
                        ) : safeReflections.length === 0 ? (
                            <EmptyState
                                icon={Pencil}
                                title="Belum ada refleksi"
                                description="Mulai perjalanan refleksi Anda dengan menulis refleksi pertama"
                                action={
                                    <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Tulis Refleksi
                                    </PrimaryButton>
                                }
                            />
                        ) : (
                            <div className="space-y-6">
                                {sessionReflections.length > 0 && (
                                    <div>
                                        <SectionHeader
                                            icon={<MessageSquare className="h-5 w-5" style={{ color: 'var(--color-brand-primary)' }} />}
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
                                                                    <p className="font-semibold font-sans text-brand-dark">
                                                                        {searchQuery ? highlightText(reflection.sessionDiscussion?.name || 'Sesi Diskusi', searchQuery) : (reflection.sessionDiscussion?.name || 'Sesi Diskusi')}
                                                                    </p>
                                                                    <p className="mt-1 text-sm text-brand-muted-dark">
                                                                        {formatDate(createdAtFor(reflection))}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <motion.div animate={{ rotate: expandedReflection === reflection.id ? 180 : 0 }}>
                                                                    <ChevronDown className="h-5 w-5 text-brand-muted-dark" />
                                                                </motion.div>
                                                            </div>
                                                        </div>
                                                        <AnimatePresence>
                                                            {expandedReflection === reflection.id && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.3 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="border-t border-white/30 px-5 pb-5 pt-4">
                                                                        <p className="whitespace-pre-wrap text-sm leading-6 text-brand-dark">
                                                                            {searchQuery ? highlightText(reflection.content, searchQuery) : reflection.content}
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
                                                                                    <Lightbulb className="h-4 w-4" style={{ color: 'var(--color-brand-primary)' }} />
                                                                                    <span className="text-sm font-semibold font-sans text-brand-dark">
                                                                                        Umpan Balik AI
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-sm leading-6 text-brand-muted-dark">
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
                                            icon={<BookOpen className="h-5 w-5" style={{ color: 'var(--color-brand-dark)' }} />}
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
                                                                    <p className="font-semibold font-sans text-brand-dark">
                                                                        {searchQuery ? highlightText(reflection.course?.name || 'Kelas Tidak Diketahui', searchQuery) : (reflection.course?.name || 'Kelas Tidak Diketahui')}
                                                                    </p>
                                                                    <p className="mt-1 text-sm text-brand-muted-dark">
                                                                        {formatDate(createdAtFor(reflection))}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <motion.div animate={{ rotate: expandedReflection === reflection.id ? 180 : 0 }}>
                                                                    <ChevronDown className="h-5 w-5 text-brand-muted-dark" />
                                                                </motion.div>
                                                            </div>
                                                        </div>
                                                        <AnimatePresence>
                                                            {expandedReflection === reflection.id && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.3 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="border-t border-white/30 px-5 pb-5 pt-4">
                                                                        <p className="whitespace-pre-wrap text-sm leading-6 text-brand-dark">
                                                                            {searchQuery ? highlightText(reflection.content, searchQuery) : reflection.content}
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
                                                                                    <Lightbulb className="h-4 w-4" style={{ color: 'var(--color-brand-primary)' }} />
                                                                                    <span className="text-sm font-semibold font-sans text-brand-dark">
                                                                                        Umpan Balik AI
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-sm leading-6 text-brand-muted-dark">
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
                 )}

            <FormModal open={showCreateModal} title="Refleksi Mingguan Baru" description="Refleksikan pengalaman pembelajaran mingguan Anda." onClose={() => setShowCreateModal(false)} maxWidth="max-w-lg" scrollable={true}>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <InputLabel htmlFor="course_id" required>
                                                Kelas
                                            </InputLabel>
                                            <select
                                                id="course_id"
                                                value={data.course_id}
                                                onChange={(e) => setData('course_id', e.target.value)}
                                                className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-brand-dark shadow-brand-sm ring-1 ring-inset ring-white/50 focus:ring-2 focus:ring-inset focus:ring-[var(--color-brand-primary)]/30"
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
                                                className="mt-1 block min-h-[150px] w-full rounded-2xl border-0 bg-white/60 px-4 py-3 text-brand-dark shadow-brand-sm ring-1 ring-inset ring-white/50 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-[var(--color-brand-primary)]/30"
                                                placeholder="Apa yang Anda pelajari hari ini? Tantangan apa yang Anda hadapi? Bagaimana Anda mengatasinya?"
                                                rows={5}
                                            />
                                            <InputError message={errors.content} />
                                            <p className="mt-2 text-xs text-brand-muted-dark">
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
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-dark">
                                                Prompt refleksi mingguan
                                            </p>
                                            <ul className="space-y-1 text-xs leading-5 text-brand-muted-dark">
                                                <li>• Apa pencapaian pembelajaran terbesar minggu ini?</li>
                                                <li>• Tantangan apa yang dihadapi dan bagaimana mengatasinya?</li>
                                                <li>• Apa yang akan dilakukan berbeda minggu depan?</li>
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
            </FormModal>
        </AppLayout>
    );
}
