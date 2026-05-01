import { Head, Link, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormEvent, useState } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';

import { InputError } from '@/components/ui/input-error';
import AppLayout from '@/layouts/app-layout';
import { useStudentNav } from '@/components/navigation/student-nav';
import { Course } from '@/types';
import student from '@/routes/student';
import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';

interface Props {
    courses: Course[];
}

export default function StudentCoursesIndex({ courses }: Props) {
    const navItems = useStudentNav('courses');
    const [showJoinModal, setShowJoinModal] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        join_code: '',
    });

    const handleJoin = (e: FormEvent) => {
        e.preventDefault();
        post(student.courses.join.url(), {
            onSuccess: () => {
                setShowJoinModal(false);
                reset();
            },
        });
    };

    return (
        <AppLayout title="Mata Kuliah Saya" navItems={navItems}>
            <Head title="Mata Kuliah Saya" />

            <div className="space-y-6">
                {/* Header with Glass Morphism */}
                <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 
                                className="text-2xl font-bold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Mata Kuliah Saya
                            </h2>
                            <p className="mt-1 text-sm text-[#6B7280]">
                                Mata kuliah dan kelompok yang Anda ikuti
                            </p>
                        </div>
                        {courses.length > 0 && (
                            <PrimaryButton onClick={() => setShowJoinModal(true)}>
                                <Plus className="h-4 w-4" />
                                Gabung Mata Kuliah
                            </PrimaryButton>
                        )}
                    </div>
                </LiquidGlassCard>

                {/* Course Grid */}
                {courses.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <LiquidGlassCard intensity="light" className="flex flex-col items-center justify-center py-12 text-center" lightMode={true}>
                            <div 
                                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                                style={{
                                    background: 'rgba(136,22,28,0.08)',
                                    border: '1px solid rgba(136,22,28,0.12)',
                                }}
                            >
                                <BookOpen className="h-7 w-7" style={{ color: '#88161c' }} />
                            </div>
                            <h3 
                                className="text-lg font-semibold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Belum ada mata kuliah
                            </h3>
                            <p className="mt-1.5 max-w-sm text-sm text-[#6B7280]">
                                Gabung mata kuliah menggunakan kode dari dosen Anda untuk memulai pembelajaran kolaboratif
                            </p>
                            <div className="mt-5">
                                <PrimaryButton onClick={() => setShowJoinModal(true)}>
                                    <Plus className="h-4 w-4" />
                                    Gabung Mata Kuliah
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
                                <Link
                                    href={student.courses.show.url({ course: course.id })}
                                    className="group block"
                                >
                                    <LiquidGlassCard 
                                        intensity="light" 
                                        className="p-6 transition-all duration-300 group-hover:shadow-lg" 
                                        lightMode={true}
                                    >
                                        <div className="mb-4">
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
                                        </div>
                                        <h3 
                                            className="text-lg font-semibold"
                                            style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                        >
                                            {course.name}
                                        </h3>
                                        <p className="mt-2 text-sm text-[#6B7280]">
                                            {course.owner?.name || course.ownerName || 'Dosen Tidak Diketahui'}
                                        </p>
                                        <div 
                                            className="mt-4 flex items-center text-sm font-medium"
                                            style={{ color: '#88161c' }}
                                        >
                                            Lihat Mata Kuliah
                                            <svg 
                                                className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" 
                                                fill="none" 
                                                viewBox="0 0 24 24" 
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </LiquidGlassCard>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Join Course Modal */}
            <AnimatePresence>
                {showJoinModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowJoinModal(false)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div
                                className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
                                style={{
                                    background: 'rgba(255,255,255,0.95)',
                                    backdropFilter: 'blur(24px)',
                                    WebkitBackdropFilter: 'blur(24px)',
                                    border: '1px solid rgba(255,255,255,0.6)',
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <h3 
                                        className="text-lg font-semibold"
                                        style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                    >
                                        Gabung Mata Kuliah
                                    </h3>
                                    <button
                                        onClick={() => setShowJoinModal(false)}
                                        className="rounded-lg p-2 text-[#6B7280] hover:text-[#4A4A4A] hover:bg-black/5 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="mt-2 text-sm text-[#6B7280]">
                                    Masukkan kode gabung yang diberikan oleh dosen Anda
                                </p>
                                <form onSubmit={handleJoin} className="mt-6 space-y-4">
                                    <div>
                                        <label
                                            htmlFor="join_code"
                                            className="block text-sm font-medium"
                                            style={{ color: '#4A4A4A' }}
                                        >
                                            Kode Gabung <span className="text-[#88161c]">*</span>
                                        </label>
                                        <input
                                            id="join_code"
                                            type="text"
                                            value={data.join_code}
                                            onChange={(e) => setData('join_code', e.target.value.toUpperCase())}
                                            className="mt-1.5 block w-full rounded-xl border px-4 py-3 text-center font-mono text-lg tracking-wider shadow-sm focus:border-[#88161c] focus:ring focus:ring-[#88161c] focus:ring-opacity-20"
                                            style={{
                                                backgroundColor: '#f8fafc',
                                                borderColor: '#e2e8f0',
                                                color: '#4A4A4A',
                                            }}
                                            placeholder="MASUKKAN KODE"
                                            maxLength={20}
                                        />
                                        <InputError message={errors.join_code} />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <SecondaryButton 
                                            onClick={() => setShowJoinModal(false)}
                                            className="flex-1"
                                        >
                                            Batal
                                        </SecondaryButton>
                                        <PrimaryButton 
                                            disabled={processing || data.join_code.length < 4}
                                            className="flex-1"
                                        >
                                            {processing ? 'Menggabung...' : 'Gabung'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
