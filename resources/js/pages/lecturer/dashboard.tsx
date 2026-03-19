import { Head, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import AppLayout from '@/layouts/app-layout';
import { SharedData } from '@/types';
import lecturer from '@/routes/lecturer';

export default function LecturerDashboard() {
    const { auth } = usePage<SharedData>().props;
    const navItems = useLecturerNav('dashboard');

    return (
        <AppLayout title="Dasbor" navItems={navItems}>
            <Head title="Dasbor Dosen" />

            <div className="space-y-6">
                {/* Welcome Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white"
                >
                    <h1 className="text-2xl font-bold">
                        Selamat datang kembali, {auth.user?.name}!
                    </h1>
                    <p className="mt-1 text-primary-100">
                        Kelola kelas Anda dan lacak kemajuan siswa
                    </p>
                </motion.div>

                {/* Quick Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Kelas Aktif', value: '—', icon: '📚' },
                        { label: 'Total Siswa', value: '—', icon: '👥' },
                        { label: 'Grup Aktif', value: '—', icon: '🎯' },
                        { label: 'Minggu Ini', value: '—', icon: '📊' },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (index + 1) }}
                            className="card p-4"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {stat.label}
                                </p>
                                <span className="text-xl">{stat.icon}</span>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {stat.value}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card p-6"
                >
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Tindakan Cepat
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <a
                            href={lecturer.courses.create.url()}
                            className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-zinc-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                                <svg className="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    Buat Kelas
                                </p>
                                <p className="text-sm text-zinc-500">
                                    Tambahkan kelas baru
                                </p>
                            </div>
                        </a>
                        <a
                            href={lecturer.courses.index.url()}
                            className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-zinc-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-900/30">
                                <svg className="h-5 w-5 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    Kelola Kelas
                                </p>
                                <p className="text-sm text-zinc-500">
                                    Lihat semua kelas
                                </p>
                            </div>
                        </a>
                        <a
                            href={lecturer.courses.index.url()}
                            className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-zinc-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    Kelola Grup
                                </p>
                                <p className="text-sm text-zinc-500">
                                    Atur siswa
                                </p>
                            </div>
                        </a>
                    </div>
                </motion.div>
            </div>
        </AppLayout>
    );
}
