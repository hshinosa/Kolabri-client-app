import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import AppLayout from '@/layouts/app-layout';
import { Course } from '@/types';
import lecturer from '@/routes/lecturer';

interface Props {
    courses: Course[];
}

export default function LecturerCoursesIndex({ courses }: Props) {
    const navItems = useLecturerNav('courses');

    return (
        <AppLayout title="Kelas Saya" navItems={navItems}>
            <Head title="Kelas Saya" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            Kelas Saya
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Kelola kelas dan grup siswa Anda
                        </p>
                    </div>
                    <Link href={lecturer.courses.create.url()} className="btn-primary">
                        Buat Kelas
                    </Link>
                </div>

                {/* Course Grid */}
                {courses.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="card flex flex-col items-center justify-center py-16 text-center"
                    >
                        <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                            Belum ada kelas
                        </h3>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Buat kelas pertama Anda untuk memulai
                        </p>
                        <Link href={lecturer.courses.create.url()} className="btn-primary mt-4">
                            Buat Kelas
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {courses.map((course, index) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={lecturer.courses.show.url({ course: course.id })}
                                    className="card block p-6 transition-shadow hover:shadow-md"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                                            {course.code}
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            {course.students_count || 0} siswa
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        {course.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Dosen: {course.owner?.name || 'Tidak Diketahui'}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        {course.groups_count || 0} grup
                                    </p>
                                    <div className="mt-4 flex items-center text-sm text-primary-600 dark:text-primary-400">
                                        Lihat Detail
                                        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
