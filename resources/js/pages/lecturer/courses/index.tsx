import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Users } from 'lucide-react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { LiquidGlassCard, PrimaryButton } from '@/components/Welcome/utils/helpers';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course } from '@/types';

interface Props {
    courses: Course[];
}

export default function LecturerCoursesIndex({ courses }: Props) {
    const navItems = useLecturerNav('courses');

    return (
        <AppLayout title="Kelas Saya" navItems={navItems}>
            <Head title="Kelas Saya" />

            <div className="space-y-6">
                <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2
                                className="text-2xl font-bold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Kelas Saya
                            </h2>
                            <p className="mt-1 text-sm text-[#6B7280]">Kelola kelas dan grup siswa Anda</p>
                        </div>
                        <PrimaryButton href={lecturer.courses.create.url()}>
                            <Plus className="h-4 w-4" />
                            Buat Kelas
                        </PrimaryButton>
                    </div>
                </LiquidGlassCard>

                {courses.length === 0 ? (
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
                                <BookOpen className="h-8 w-8" style={{ color: '#88161c' }} />
                            </div>
                            <h3
                                className="text-lg font-semibold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Belum ada kelas
                            </h3>
                            <p className="mt-2 max-w-sm text-sm text-[#6B7280]">
                                Buat kelas pertama Anda untuk mulai mengelola pembelajaran dan kolaborasi mahasiswa.
                            </p>
                            <div className="mt-6">
                                <PrimaryButton href={lecturer.courses.create.url()}>
                                    <Plus className="h-4 w-4" />
                                    Buat Kelas
                                </PrimaryButton>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {courses.map((course, index) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                            >
                                <Link href={lecturer.courses.show.url({ course: course.id })} className="group block">
                                    <LiquidGlassCard
                                        intensity="light"
                                        className="p-6 transition-all duration-300 group-hover:shadow-lg"
                                        lightMode={true}
                                    >
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <span
                                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                                                style={{
                                                    background: 'rgba(136,22,28,0.08)',
                                                    color: '#88161c',
                                                    border: '1px solid rgba(136,22,28,0.15)',
                                                }}
                                            >
                                                {course.code}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                                                <Users className="h-3.5 w-3.5" />
                                                {course.students_count || 0} siswa
                                            </span>
                                        </div>

                                        <h3
                                            className="text-lg font-semibold"
                                            style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                        >
                                            {course.name}
                                        </h3>
                                        <p className="mt-2 text-sm text-[#6B7280]">
                                            Dosen: {course.owner?.name || 'Tidak Diketahui'}
                                        </p>
                                        <div className="mt-4 flex items-center justify-between gap-3">
                                            <p className="text-sm text-[#6B7280]">{course.groups_count || 0} grup</p>
                                            <div className="flex items-center text-sm font-medium" style={{ color: '#88161c' }}>
                                                Lihat Detail
                                                <svg
                                                    className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </LiquidGlassCard>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
