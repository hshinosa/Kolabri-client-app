import { Head, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { BarChart3, BookOpen, CheckCircle2, Clock3, Copy, FolderKanban, Users } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { LiquidGlassCard, OrganicBlob, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { InputError } from '@/components/ui/input-error';
import CourseDetailTabs, { TabId } from '@/components/lecturer/CourseDetailTabs';
import AktivitasTab from '@/components/lecturer/AktivitasTab';
import AttendanceTab from '@/components/lecturer/AttendanceTab';
import SessionsTab from '@/components/lecturer/SessionsTab';
import UnifiedMaterialsTab from '@/components/lecturer/UnifiedMaterialsTab';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { ActivitySummary, Course, KnowledgeBase, StudentActivity } from '@/types';

const headingStyle = {
    color: 'var(--color-brand-dark)',
} as const;

const bodyTextClass = 'text-sm text-brand-muted-dark font-sans';

const brandChipStyle = {
    background: 'rgba(136,22,28,0.08)',
    color: 'var(--color-brand-primary)',
    border: '1px solid rgba(136,22,28,0.15)',
} as const;

const glassPanelStyle = {
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.65)',
} as const;

interface Props {
    course: Course & {
        join_code: string;
        knowledge_base: KnowledgeBase[];
    };
}

export default function ShowCourse({ course }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('aktivitas');
    const [hubStats, setHubStats] = useState({ total: 0, ready: 0, processing: 0, failed: 0 });

    const [activityData, setActivityData] = useState<StudentActivity[]>([]);
    const [activitySummary, setActivitySummary] = useState<ActivitySummary>({ total_students: 0, total_messages: 0, active_students: 0 });
    const [activityLoading, setActivityLoading] = useState(false);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    const refreshHubStats = useCallback(async () => {
        try {
            const res = await fetch(`/lecturer/courses/${course.id}/materials-hub`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!res.ok) return;
            const data = await res.json();
            const kb = (data.kb_by_material_id ?? {}) as Record<string, { vector_status?: string }>;
            const materials = data.materials ?? [];
            let ready = 0;
            let processing = 0;
            let failed = 0;
            for (const m of materials) {
                const st = kb[m.id]?.vector_status;
                if (st === 'ready') ready += 1;
                else if (st === 'pending' || st === 'processing') processing += 1;
                else if (st === 'failed') failed += 1;
            }
            setHubStats({ total: materials.length, ready, processing, failed });
        } catch {
            return;
        }
    }, [course.id]);

    useEffect(() => {
        void refreshHubStats();
        const id = window.setInterval(() => void refreshHubStats(), 5000);
        return () => window.clearInterval(id);
    }, [refreshHubStats]);

    const fetchActivity = useCallback(async () => {
        setActivityLoading(true);
        try {
            const res = await fetch(`/lecturer/courses/${course.id}/aktivitas`);
            const data = await res.json();
            setActivityData(data.data || []);
            setActivitySummary(data.summary || { total_students: 0, total_messages: 0, active_students: 0 });
        } catch {
            setActivityData([]);
        }
        setActivityLoading(false);
    }, [course.id]);

    useEffect(() => {
        if (activeTab === 'aktivitas' && activityData.length === 0) {
            fetchActivity();
        }
    }, [activeTab, activityData.length, fetchActivity]);

    const {
        data: groupPolicyData,
        setData: setGroupPolicyData,
        put: updateGroupPolicy,
        processing: updatingGroupPolicy,
        errors: groupPolicyErrors,
    } = useForm({
        min_members_per_group: course.min_members_per_group ?? 1,
        max_members_per_group: course.max_members_per_group ?? 1000,
        ai_guardrail_preset: course.ai_guardrail_preset ?? 'balanced',
        ai_guardrail_allow_rewrite: course.ai_guardrail_allow_rewrite ?? true,
        ai_guardrail_allow_flag_only: course.ai_guardrail_allow_flag_only ?? false,
        ai_scaffolding_level: course.ai_scaffolding_level ?? 'auto',
        ai_scaffolding_enabled: course.ai_scaffolding_enabled ?? true,
    });

    const navItems = useLecturerNav('course-detail');

    const copyJoinCode = () => {
        navigator.clipboard.writeText(course.join_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGroupPolicySubmit = (event: FormEvent) => {
        event.preventDefault();
        updateGroupPolicy(`/lecturer/courses/${course.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout title={course.name} navItems={navItems}>
            <Head title={course.name} />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={300} />
                <OrganicBlob className="top-36 -right-16" delay={-5} color="rgba(136, 22, 28, 0.03)" size={240} />

                <div className="relative space-y-6">
                    {isLoading ? (
                        <DashboardSkeleton />
                    ) : (
                    <>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <LiquidGlassCard intensity="medium" className="p-6 sm:p-8" lightMode={true}>
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-3xl">
                                      <div className="flex flex-wrap items-center gap-2">
                                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={brandChipStyle}>
                                              {course.code}
                                          </span>
                                          {/* 
                                           * TEMP HIDE (user request): 
                                           * Removed the "Belum ada materi" / "Semua siap" / "Sedang diproses" etc. status chips 
                                           * (knowledgeStatusLabel + knowledgeStatusStyle + Sparkles icon).
                                           * These were summary chips for materi readiness in detail kelas header.
                                           * Will restore if needed. Computation logic was cleaned as part of minimal patch.
                                           */}
                                      </div>

                                    <h1 className="mt-3 text-2xl font-bold sm:text-3xl" style={headingStyle}>
                                        {course.name}
                                    </h1>
                                    <p className={`mt-2 max-w-2xl ${bodyTextClass}`}>
                                        Kelola materi, minggu perkuliahan, dan indeks AI dari tab Materi; pantau aktivitas dan aturan grup di sini.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                                    <SecondaryButton href={lecturer.groups.index.url({ course: course.id })} className="min-w-[170px]">
                                        <FolderKanban className="h-4 w-4" />
                                        Kelola Kelompok
                                    </SecondaryButton>
                                    <PrimaryButton href={lecturer.analytics.detail.url({ course: course.id })} className="min-w-[170px]">
                                        <BarChart3 className="h-4 w-4" />
                                        Analitik
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
                                value: hubStats.ready,
                                detail: `${hubStats.total} total materi kelas`,
                                icon: CheckCircle2,
                                color: '#166534',
                            },
                            {
                                label: 'Dalam Proses',
                                value: hubStats.processing,
                                detail:
                                    hubStats.failed > 0
                                        ? `${hubStats.failed} file perlu perhatian`
                                        : hubStats.processing > 0
                                          ? 'Memperbarui otomatis…'
                                          : 'Indeks AI dari upload materi',
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
                                            <p className="text-sm text-brand-muted-dark">{stat.label}</p>
                                            <p className="mt-2 text-3xl font-light" style={headingStyle}>
                                                {stat.value}
                                            </p>
                                            <p className="mt-1 text-xs text-brand-muted-dark">{stat.detail}</p>
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
                        transition={{ delay: 0.10 }}
                    >
                        <CourseDetailTabs courseId={course.id} activeTab={activeTab} onTabChange={setActiveTab} />
                    </motion.div>

                    {activeTab === 'aktivitas' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                            <AktivitasTab students={activityData} summary={activitySummary} loading={activityLoading} />
                        </motion.div>
                    )}

                    {activeTab === 'sesi' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                            <SessionsTab courseId={course.id} />
                        </motion.div>
                    )}

                    {activeTab === 'attendance' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                            <AttendanceTab courseId={course.id} />
                        </motion.div>
                    )}

                    {activeTab === 'materi' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                            <UnifiedMaterialsTab courseId={course.id} onHubStats={setHubStats} />
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 }}
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
                                        <p className="text-sm font-medium text-brand-muted-dark">Kode bergabung mahasiswa</p>
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

                            </div>

                            <form onSubmit={handleGroupPolicySubmit} className="mt-5 rounded-[28px] p-5" style={glassPanelStyle}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="grid gap-4 sm:grid-cols-2 lg:flex-1">
                                        <div>
                                            <p className="text-sm font-medium text-brand-muted-dark">Minimal anggota per kelompok</p>
                                            <input
                                                type="number"
                                                min={1}
                                                value={groupPolicyData.min_members_per_group}
                                                onChange={(e) => setGroupPolicyData('min_members_per_group', Number(e.target.value) || 1)}
                                                className="mt-2 block w-full rounded-xl border-0 bg-white/70 px-4 py-3 text-sm text-brand-dark shadow-brand-sm ring-1 ring-inset ring-white/50"
                                            />
                                            <InputError message={groupPolicyErrors.min_members_per_group} className="mt-1.5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-brand-muted-dark">Maksimal anggota per kelompok</p>
                                            <input
                                                type="number"
                                                min={1}
                                                value={groupPolicyData.max_members_per_group}
                                                onChange={(e) => setGroupPolicyData('max_members_per_group', Number(e.target.value) || 1)}
                                                className="mt-2 block w-full rounded-xl border-0 bg-white/70 px-4 py-3 text-sm text-brand-dark shadow-brand-sm ring-1 ring-inset ring-white/50"
                                            />
                                            <InputError message={groupPolicyErrors.max_members_per_group} className="mt-1.5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-brand-muted-dark">Tingkat pembatasan AI</p>
                                            <select
                                                value={groupPolicyData.ai_guardrail_preset}
                                                onChange={(e) => setGroupPolicyData('ai_guardrail_preset', e.target.value as 'strict' | 'balanced' | 'relaxed')}
                                                className="mt-2 block w-full rounded-xl border-0 bg-white/70 px-4 py-3 text-sm text-brand-dark shadow-brand-sm ring-1 ring-inset ring-white/50"
                                            >
                                                <option value="strict">Ketat</option>
                                                <option value="balanced">Seimbang</option>
                                                <option value="relaxed">Fleksibel</option>
                                            </select>
                                            <p className="mt-2 px-1 text-xs leading-5 text-brand-muted-dark">
                                                {groupPolicyData.ai_guardrail_preset === 'strict'
                                                    ? 'Ketat: AI paling selektif. Permintaan yang mengarah ke jawaban langsung, penyelesaian tugas, atau di luar konteks belajar lebih mudah diblokir. Cocok untuk kelas dengan risiko kecurangan tinggi.'
                                                    : groupPolicyData.ai_guardrail_preset === 'relaxed'
                                                      ? 'Fleksibel: AI lebih longgar. Pelanggaran ringan cenderung ditandai saja, sementara bantuan belajar tetap diberikan. Cocok untuk brainstorming atau eksplorasi konsep.'
                                                      : 'Seimbang: Default. AI tetap membatasi permintaan yang tidak etis atau tidak mendukung belajar mandiri, tetapi tetap memberi petunjuk, langkah, atau ringkasan konsep. Cocok untuk diskusi kelas reguler.'}
                                            </p>
                                            <InputError message={groupPolicyErrors.ai_guardrail_preset} className="mt-1.5" />
                                        </div>
                                        <div className="sm:col-span-2 grid gap-3">
                                            <label className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm text-brand-dark ring-1 ring-white/50">
                                                <span>Izinkan AI menyesuaikan jawaban ke bentuk yang aman</span>
                                                <input
                                                    type="checkbox"
                                                    checked={groupPolicyData.ai_guardrail_allow_rewrite}
                                                    onChange={(e) => setGroupPolicyData('ai_guardrail_allow_rewrite', e.target.checked)}
                                                />
                                            </label>
                                            <p className="px-1 text-xs leading-5 text-brand-muted-dark">
                                                Apabila mahasiswa mengajukan permintaan yang tidak layak dijawab secara langsung, AI tetap memberikan bantuan dalam bentuk arahan belajar, langkah penyelesaian, atau ringkasan konsep.
                                            </p>
                                            <label className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm text-brand-dark ring-1 ring-white/50">
                                                <span>Untuk pelanggaran ringan, tampilkan peringatan tanpa memblokir respons</span>
                                                <input
                                                    type="checkbox"
                                                    checked={groupPolicyData.ai_guardrail_allow_flag_only}
                                                    onChange={(e) => setGroupPolicyData('ai_guardrail_allow_flag_only', e.target.checked)}
                                                />
                                            </label>
                                            <p className="px-1 text-xs leading-5 text-brand-muted-dark">
                                                AI tetap dapat merespons, tetapi sistem akan menandai interaksi yang perlu dicermati sesuai kebijakan kelas.
                                            </p>
                                        </div>
                                        <div className="sm:col-span-2 grid gap-3">
                                            <label className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm text-brand-dark ring-1 ring-white/50">
                                                <span>Izinkan AI menyesuaikan tingkat pendampingan sesuai kebutuhan belajar</span>
                                                <input
                                                    type="checkbox"
                                                    checked={groupPolicyData.ai_scaffolding_enabled}
                                                    onChange={(e) => setGroupPolicyData('ai_scaffolding_enabled', e.target.checked)}
                                                />
                                            </label>
                                            <p className="px-1 text-xs leading-5 text-brand-muted-dark">
                                                {groupPolicyData.ai_scaffolding_enabled
                                                    ? 'Saat diaktifkan, AI dapat menyesuaikan seberapa rinci arahan yang diberikan agar selaras dengan tingkat kemandirian belajar mahasiswa.'
                                                    : 'AI tidak menyesuaikan tingkat pendampingan secara khusus.'}
                                            </p>
                                        </div>
                                        {groupPolicyData.ai_scaffolding_enabled && (
                                            <div>
                                                <p className="text-sm font-medium text-brand-muted-dark">Tingkat pendampingan AI</p>
                                                <select
                                                    value={groupPolicyData.ai_scaffolding_level}
                                                    onChange={(e) => setGroupPolicyData('ai_scaffolding_level', e.target.value as 'early' | 'late' | 'auto')}
                                                    className="mt-2 block w-full rounded-xl border-0 bg-white/70 px-4 py-3 text-sm text-brand-dark shadow-brand-sm ring-1 ring-inset ring-white/50"
                                                >
                                                    <option value="auto">Otomatis menyesuaikan</option>
                                                    <option value="early">Pendampingan tinggi (lebih terarah dan bertahap)</option>
                                                    <option value="late">Pendampingan ringan (lebih mandiri)</option>
                                                </select>
                                                <InputError message={groupPolicyErrors.ai_scaffolding_level} className="mt-1.5" />
                                            </div>
                                        )}
                                    </div>
                                    <PrimaryButton type="submit" className="justify-center" disabled={updatingGroupPolicy}>
                                        {updatingGroupPolicy ? 'Menyimpan...' : 'Simpan aturan grup'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </LiquidGlassCard>
                    </motion.div>
                    </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
