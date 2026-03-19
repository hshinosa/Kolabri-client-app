import { Head, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormEvent, useState } from 'react';
import { Check, KeyRound, Plus, Users, X } from 'lucide-react';

import { InputError } from '@/components/ui/input-error';
import { InputLabel } from '@/components/ui/input-label';
import AppLayout from '@/layouts/app-layout';
import { useStudentNav } from '@/components/navigation/student-nav';
import { Course, User } from '@/types';
import student from '@/routes/student';
import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';

interface ChatSpace {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
}

interface GroupWithDetails {
    id: string;
    name: string;
    joinCode: string;
    members?: User[];
    chatSpaces?: ChatSpace[];
    goalsCount?: number;
}

interface Props {
    course: Course;
    groups: GroupWithDetails[];
    myGroup: GroupWithDetails | null;
    students: User[];
}

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const bodyTextClass = 'text-sm text-[#6B7280]';

export default function StudentGroupsIndex({ course, groups, myGroup, students }: Props) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const navItems = useStudentNav('groups', { courseId: course.id });

    const createForm = useForm({
        name: '',
    });

    const joinForm = useForm({
        join_code: '',
    });

    const handleCreateGroup = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(student.groups.store.url({ course: course.id }), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const handleJoinGroup = (e: FormEvent) => {
        e.preventDefault();
        joinForm.post(student.groups.join.url(), {
            onSuccess: () => {
                setShowJoinModal(false);
                joinForm.reset();
            },
        });
    };

    return (
        <AppLayout title={`Grup - ${course.name}`} navItems={navItems}>
            <Head title={`Grup - ${course.name}`} />

            <div className="space-y-6">
                <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                    <div className="flex items-center gap-2">
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
                    <h2
                        className="mt-3 text-2xl font-bold"
                        style={headingStyle}
                    >
                        Cari atau Buat Grup
                    </h2>
                    <p className={`mt-1 ${bodyTextClass}`}>
                        Bergabung dengan grup yang sudah ada atau buat grup baru untuk {course.name}
                    </p>
                </LiquidGlassCard>

                {myGroup && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <div className="flex items-center gap-4">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <Check className="h-6 w-6" style={{ color: '#88161c' }} />
                                </div>
                                <div className="flex-1">
                                    <h3
                                        className="text-lg font-semibold"
                                        style={headingStyle}
                                    >
                                        Anda sudah bergabung dengan grup
                                    </h3>
                                    <p className={bodyTextClass}>
                                        <span className="font-medium">{myGroup.name}</span> • Kode:{' '}
                                        <code
                                            className="rounded px-1.5 py-0.5 font-mono text-xs"
                                            style={{
                                                background: 'rgba(136,22,28,0.08)',
                                                color: '#88161c',
                                            }}
                                        >
                                            {myGroup.joinCode}
                                        </code>
                                    </p>
                                </div>
                                <a
                                    href={student.courses.show.url({ course: course.id })}
                                    className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        color: '#88161c',
                                        border: '1px solid rgba(136,22,28,0.15)',
                                    }}
                                >
                                    Kembali ke Kelas
                                </a>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                )}

                {/* Action Buttons */}
                {!myGroup && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid gap-4 sm:grid-cols-2"
                    >
                        {/* Join with Code */}
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="group flex items-center gap-4 rounded-2xl p-6 text-left transition-all"
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
                                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl transition-all group-hover:scale-105"
                                style={{
                                    background: 'rgba(136,22,28,0.08)',
                                    border: '1px solid rgba(136,22,28,0.12)',
                                }}
                            >
                                <KeyRound className="h-7 w-7" style={{ color: '#88161c' }} />
                            </div>
                            <div>
                                <h3
                                    className="text-lg font-semibold"
                                    style={headingStyle}
                                >
                                    Gabung dengan Kode
                                </h3>
                                <p className={`mt-1 ${bodyTextClass}`}>
                                    Masukkan kode grup yang diberikan oleh teman atau dosen
                                </p>
                            </div>
                        </button>

                        {/* Create New Group */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="group flex items-center gap-4 rounded-2xl p-6 text-left transition-all"
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
                                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl transition-all group-hover:scale-105"
                                style={{
                                    background: 'rgba(74,74,74,0.08)',
                                    border: '1px solid rgba(74,74,74,0.12)',
                                }}
                            >
                                <Plus className="h-7 w-7" style={{ color: '#4A4A4A' }} />
                            </div>
                            <div>
                                <h3
                                    className="text-lg font-semibold"
                                    style={headingStyle}
                                >
                                    Buat Grup Baru
                                </h3>
                                <p className={`mt-1 ${bodyTextClass}`}>
                                    Buat grup baru dan ajak teman Anda untuk bergabung
                                </p>
                            </div>
                        </button>
                    </motion.div>
                )}

                {/* Available Groups */}
                {!myGroup && groups.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4"
                    >
                        <h3
                            className="text-lg font-semibold"
                            style={headingStyle}
                        >
                            Grup yang Tersedia ({groups.length})
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {groups.map((group, index) => (
                                <motion.div
                                    key={group.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + index * 0.05 }}
                                >
                                    <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold"
                                                style={{
                                                    background: 'rgba(136,22,28,0.08)',
                                                    color: '#88161c',
                                                    border: '1px solid rgba(136,22,28,0.12)',
                                                }}
                                            >
                                                {group.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <h4
                                                    className="font-medium"
                                                    style={{ color: '#4A4A4A' }}
                                                >
                                                    {group.name}
                                                </h4>
                                                <p className="text-xs text-[#6B7280]">
                                                    {group.members?.length || 0} anggota
                                                </p>
                                            </div>
                                        </div>
                                        {group.members && group.members.length > 0 && (
                                            <div className="mt-3 flex -space-x-2">
                                                {group.members.slice(0, 5).map((member) => (
                                                    <div
                                                        key={member.id}
                                                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-medium"
                                                        style={{
                                                            borderColor: 'rgba(255,255,255,0.8)',
                                                            background: 'rgba(136,22,28,0.08)',
                                                            color: '#88161c',
                                                        }}
                                                        title={member.name}
                                                    >
                                                        {member.name.charAt(0)}
                                                    </div>
                                                ))}
                                                {group.members.length > 5 && (
                                                    <div
                                                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-medium"
                                                        style={{
                                                            borderColor: 'rgba(255,255,255,0.8)',
                                                            background: 'rgba(74,74,74,0.08)',
                                                            color: '#4A4A4A',
                                                        }}
                                                    >
                                                        +{group.members.length - 5}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </LiquidGlassCard>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Empty State */}
                {!myGroup && groups.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <LiquidGlassCard
                            intensity="medium"
                            className="flex flex-col items-center justify-center py-16 text-center"
                            lightMode={true}
                        >
                            <div
                                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                                style={{
                                    background: 'rgba(136,22,28,0.08)',
                                    border: '1px solid rgba(136,22,28,0.12)',
                                }}
                            >
                                <Users className="h-8 w-8" style={{ color: '#88161c' }} />
                            </div>
                            <h3
                                className="text-lg font-semibold"
                                style={headingStyle}
                            >
                                Belum ada grup
                            </h3>
                            <p className={`mt-2 max-w-sm ${bodyTextClass}`}>
                                Jadilah yang pertama! Buat grup baru atau masukkan kode dari teman.
                            </p>
                            <div className="mt-6">
                                <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                    <Plus className="h-4 w-4" />
                                    Buat Grup Baru
                                </PrimaryButton>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                )}
            </div>

            {/* Create Group Modal */}
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
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-md p-6" lightMode={true}>
                                <div className="flex items-center justify-between">
                                    <h3
                                        className="text-lg font-semibold"
                                        style={headingStyle}
                                    >
                                        Buat Grup Baru
                                    </h3>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-white/50 hover:text-[#4A4A4A]"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className={`mt-2 ${bodyTextClass}`}>
                                    Kode unik akan dibuat otomatis untuk teman bergabung
                                </p>
                                <form onSubmit={handleCreateGroup} className="mt-6 space-y-4">
                                    <div>
                                        <InputLabel htmlFor="group_name" required>
                                            Nama Grup
                                        </InputLabel>
                                        <input
                                            id="group_name"
                                            type="text"
                                            value={createForm.data.name}
                                            onChange={(e) => createForm.setData('name', e.target.value)}
                                            className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30 sm:text-sm sm:leading-6"
                                            placeholder="misalnya, Kelompok A"
                                            autoFocus
                                        />
                                        <InputError message={createForm.errors.name} />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <SecondaryButton
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1"
                                        >
                                            Batal
                                        </SecondaryButton>
                                        <PrimaryButton
                                            disabled={createForm.processing}
                                            className="flex-1"
                                        >
                                            {createForm.processing ? 'Membuat...' : 'Buat Grup'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Join Group Modal */}
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
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-md p-6" lightMode={true}>
                                <div className="flex items-center justify-between">
                                    <h3
                                        className="text-lg font-semibold"
                                        style={headingStyle}
                                    >
                                        Gabung dengan Kode
                                    </h3>
                                    <button
                                        onClick={() => setShowJoinModal(false)}
                                        className="rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-white/50 hover:text-[#4A4A4A]"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className={`mt-2 ${bodyTextClass}`}>
                                    Masukkan kode grup 6 karakter yang diberikan kepada Anda
                                </p>
                                <form onSubmit={handleJoinGroup} className="mt-6 space-y-4">
                                    <div>
                                        <InputLabel htmlFor="join_code" required>
                                            Kode Grup
                                        </InputLabel>
                                        <input
                                            id="join_code"
                                            type="text"
                                            value={joinForm.data.join_code}
                                            onChange={(e) => joinForm.setData('join_code', e.target.value.toUpperCase())}
                                            className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-center font-mono text-xl tracking-widest text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30"
                                            placeholder="XXXXXX"
                                            maxLength={6}
                                            autoFocus
                                        />
                                        <InputError message={joinForm.errors.join_code} />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <SecondaryButton
                                            onClick={() => setShowJoinModal(false)}
                                            className="flex-1"
                                        >
                                            Batal
                                        </SecondaryButton>
                                        <PrimaryButton
                                            disabled={joinForm.processing || joinForm.data.join_code.length < 6}
                                            className="flex-1"
                                        >
                                            {joinForm.processing ? 'Bergabung...' : 'Gabung'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
