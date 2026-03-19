import { Head, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { BarChart3, BookOpen, Plus, Users } from 'lucide-react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { LiquidGlassCard, OrganicBlob } from '@/components/Welcome/utils/helpers';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { SharedData } from '@/types';

export default function LecturerDashboard() {
    const { auth } = usePage<SharedData>().props;
    const navItems = useLecturerNav('dashboard');

    return (
        <AppLayout title="Dasbor" navItems={navItems}>
            <Head title="Dasbor Dosen" />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={300} />
                <OrganicBlob className="top-40 -right-20" delay={-5} color="rgba(136, 22, 28, 0.03)" size={250} />

                <div className="relative space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1
                                        className="text-2xl font-bold"
                                        style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                    >
                                        Selamat datang kembali, {auth.user?.name}!
                                    </h1>
                                    <p className="mt-2 text-[#6B7280]">
                                        Kelola kelas Anda dan pantau kolaborasi mahasiswa dari satu tempat.
                                    </p>
                                </div>
                                <div
                                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <BookOpen className="h-7 w-7" style={{ color: '#88161c' }} />
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Kelas Aktif', value: '—', icon: BookOpen, color: '#88161c' },
                            { label: 'Total Siswa', value: '—', icon: Users, color: '#4A4A4A' },
                            { label: 'Grup Aktif', value: '—', icon: BarChart3, color: '#6B7280' },
                            { label: 'Minggu Ini', value: '—', icon: Plus, color: '#88161c' },
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (index + 1), duration: 0.5 }}
                            >
                                <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm text-[#6B7280]">{stat.label}</p>
                                            <p
                                                className="mt-2 text-3xl font-light"
                                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                            >
                                                {stat.value}
                                            </p>
                                        </div>
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                                            style={{
                                                background: `${stat.color}15`,
                                                border: `1px solid ${stat.color}25`,
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
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <h2
                                className="mb-6 text-lg font-semibold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Tindakan Cepat
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    {
                                        href: lecturer.courses.create.url(),
                                        icon: Plus,
                                        title: 'Buat Kelas',
                                        desc: 'Tambahkan kelas baru',
                                        color: '#88161c',
                                    },
                                    {
                                        href: lecturer.courses.index.url(),
                                        icon: BookOpen,
                                        title: 'Kelola Kelas',
                                        desc: 'Lihat semua kelas',
                                        color: '#4A4A4A',
                                    },
                                    {
                                        href: lecturer.courses.index.url(),
                                        icon: Users,
                                        title: 'Kelola Grup',
                                        desc: 'Atur siswa',
                                        color: '#6B7280',
                                    },
                                ].map((action, index) => (
                                    <motion.a
                                        key={action.title}
                                        href={action.href}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="group flex items-center gap-4 rounded-2xl p-4 transition-all"
                                        style={{
                                            background: 'rgba(255,255,255,0.5)',
                                            border: '1px solid rgba(255,255,255,0.6)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                        }}
                                    >
                                        <div
                                            className="flex h-12 w-12 items-center justify-center rounded-xl transition-all group-hover:scale-110"
                                            style={{
                                                background: `${action.color}10`,
                                                border: `1px solid ${action.color}20`,
                                            }}
                                        >
                                            <action.icon className="h-6 w-6" style={{ color: action.color }} />
                                        </div>
                                        <div>
                                            <p className="font-medium" style={{ color: '#4A4A4A' }}>
                                                {action.title}
                                            </p>
                                            <p className="text-sm text-[#6B7280]">{action.desc}</p>
                                        </div>
                                    </motion.a>
                                ))}
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </div>
        </AppLayout>
    );
}
