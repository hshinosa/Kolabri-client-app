import { Head, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormEvent, useState } from 'react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { InputError } from '@/components/ui/input-error';
import { InputLabel } from '@/components/ui/input-label';
import AppLayout from '@/layouts/app-layout';
import { Course, User } from '@/types';
import lecturer from '@/routes/lecturer';

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
    status?: string;
    has_goal?: boolean;
}

interface Props {
    course: Course;
    groups: GroupWithDetails[];
    students: User[];
}

export default function GroupsIndex({ course, groups, students }: Props) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
    const [showChatSpaceModal, setShowChatSpaceModal] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [selectedGroupJoinCode, setSelectedGroupJoinCode] = useState<string | null>(null);
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

    const navItems = useLecturerNav('groups', { courseId: course.id });

    const createForm = useForm({
        name: '',
    });

    const assignForm = useForm({
        member_ids: [] as string[],
    });

    const chatSpaceForm = useForm({
        name: '',
        description: '',
    });

    const deleteForm = useForm({});

    const handleCreateGroup = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(lecturer.groups.store.url({ course: course.id }), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const handleAssignMembers = (e: FormEvent) => {
        e.preventDefault();
        if (!showAssignModal) return;

        assignForm.post(
            lecturer.groups.members.store.url({ course: course.id, group: showAssignModal }),
            {
                onSuccess: () => {
                    setShowAssignModal(null);
                    assignForm.reset();
                },
            },
        );
    };

    const handleCreateChatSpace = (e: FormEvent) => {
        e.preventDefault();
        if (!showChatSpaceModal) return;

        chatSpaceForm.post(
            `/lecturer/groups/${showChatSpaceModal}/chat-spaces`,
            {
                onSuccess: () => {
                    setShowChatSpaceModal(null);
                    chatSpaceForm.reset();
                },
            }
        );
    };

    const handleDeleteGroup = () => {
        if (!deleteGroupId) return;

        deleteForm.delete(lecturer.groups.destroy.url({ course: course.id, group: deleteGroupId }), {
            onSuccess: () => {
                setDeleteGroupId(null);
            },
        });
    };

    const toggleMember = (userId: string) => {
        const current = assignForm.data.member_ids;
        if (current.includes(userId)) {
            assignForm.setData('member_ids', current.filter((id) => id !== userId));
        } else {
            assignForm.setData('member_ids', [...current, userId]);
        }
    };

    const copyJoinCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // Get unassigned students
    const assignedStudentIds = groups.flatMap((g) => g.members?.map((m) => m.id) || []);
    const unassignedStudents = students.filter((s) => !assignedStudentIds.includes(s.id));

    return (
        <AppLayout title={`Grup - ${course.name}`} navItems={navItems}>
            <Head title={`Grup - ${course.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            Grup
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Kelola grup siswa untuk {course.code}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary"
                    >
                        Tambah Grup
                    </button>
                </div>

                {/* Groups Grid */}
                {groups.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="card flex flex-col items-center justify-center py-16 text-center"
                    >
                        <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                            Belum ada grup
                        </h3>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Buat grup dan tugaskan siswa
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary mt-4"
                        >
                            Tambah Grup
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {groups.map((group, index) => (
                            <motion.div
                                key={group.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="card p-6"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        {group.name}
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setSelectedGroupJoinCode(group.joinCode)}
                                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                            title="Lihat kode grup"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setDeleteGroupId(group.id)}
                                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                            title="Hapus grup"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Join Code Badge */}
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="text-xs text-zinc-500">Kode:</span>
                                    <code className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                        {group.joinCode}
                                    </code>
                                </div>

                                {/* Chat Spaces */}
                                <div className="mb-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-medium text-zinc-500">Sesi Diskusi</span>
                                        <button
                                            onClick={() => setShowChatSpaceModal(group.id)}
                                            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                                        >
                                            + Tambah
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {group.chatSpaces && group.chatSpaces.map((space) => (
                                                <span
                                                    key={space.id}
                                                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                    {space.name}
                                                </span>
                                            ))}
                                            {(!group.chatSpaces || group.chatSpaces.length === 0) && (
                                                <span className="text-xs text-zinc-400">Belum ada sesi diskusi</span>
                                            )}
                                        </div>
                                    </div>

                                {/* Members List */}
                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-zinc-500">
                                        Anggota ({group.members?.length || 0})
                                    </span>
                                    {group.members && group.members.length > 0 ? (
                                        group.members.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-2"
                                            >
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                                    {member.name}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500">Belum ada anggota</p>
                                    )}
                                </div>

                                <button
                                    onClick={() => setShowAssignModal(group.id)}
                                    className="btn-secondary mt-4 w-full text-sm"
                                >
                                    Tugaskan Siswa
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Unassigned Students */}
                {unassignedStudents.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card p-6"
                    >
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Siswa yang Belum Ditugaskan ({unassignedStudents.length})
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {unassignedStudents.map((student) => (
                                <span
                                    key={student.id}
                                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                >
                                    {student.name}
                                </span>
                            ))}
                        </div>
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
                            className="fixed inset-0 z-40 bg-black"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Buat Grup Baru
                                </h3>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Kode unik akan dibuat otomatis untuk siswa bergabung
                                </p>
                                <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
                                    <div>
                                        <InputLabel htmlFor="group_name" required>
                                            Nama Grup
                                        </InputLabel>
                                        <input
                                            id="group_name"
                                            type="text"
                                            value={createForm.data.name}
                                            onChange={(e) => createForm.setData('name', e.target.value)}
                                            className="input-field mt-1"
                                            placeholder="misalnya, Grup A"
                                        />
                                        <InputError message={createForm.errors.name} />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="btn-secondary flex-1"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={createForm.processing}
                                            className="btn-primary flex-1"
                                        >
                                            {createForm.processing ? 'Membuat...' : 'Buat'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Assign Members Modal */}
            <AnimatePresence>
                {showAssignModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAssignModal(null)}
                            className="fixed inset-0 z-40 bg-black"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Tugaskan Siswa
                                </h3>
                                <form onSubmit={handleAssignMembers} className="mt-4">
                                    <div className="max-h-64 space-y-2 overflow-y-auto">
                                        {unassignedStudents.length === 0 ? (
                                            <p className="py-4 text-center text-sm text-zinc-500">
                                                Semua siswa telah ditugaskan
                                            </p>
                                        ) : (
                                            unassignedStudents.map((student) => (
                                                <label
                                                    key={student.id}
                                                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={assignForm.data.member_ids.includes(student.id)}
                                                        onChange={() => toggleMember(student.id)}
                                                        className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="text-sm text-zinc-900 dark:text-zinc-100">
                                                        {student.name}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <InputError message={assignForm.errors.member_ids} />
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowAssignModal(null)}
                                            className="btn-secondary flex-1"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={assignForm.processing || assignForm.data.member_ids.length === 0}
                                            className="btn-primary flex-1"
                                        >
                                            {assignForm.processing ? 'Menugaskan...' : 'Tugaskan'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Join Code Modal */}
            <AnimatePresence>
                {selectedGroupJoinCode && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedGroupJoinCode(null)}
                            className="fixed inset-0 z-40 bg-black"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="card w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Kode Bergabung Grup
                                </h3>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Bagikan kode ini kepada mahasiswa untuk bergabung ke grup
                                </p>
                                <div className="my-6 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
                                    <span className="font-mono text-3xl font-bold tracking-wider text-primary-600 dark:text-primary-400">
                                        {selectedGroupJoinCode}
                                    </span>
                                </div>
                                <button
                                    onClick={() => copyJoinCode(selectedGroupJoinCode)}
                                    className="btn-primary w-full"
                                >
                                    {copiedCode === selectedGroupJoinCode ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Tersalin!
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Salin Kode
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setSelectedGroupJoinCode(null)}
                                    className="mt-3 w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                >
                                    Tutup
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Create Chat Space Modal */}
            <AnimatePresence>
                {showChatSpaceModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowChatSpaceModal(null)}
                            className="fixed inset-0 z-40 bg-black"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Buat Chat Space Baru
                                </h3>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Chat space adalah ruang diskusi terpisah di dalam grup
                                </p>
                                <form onSubmit={handleCreateChatSpace} className="mt-4 space-y-4">
                                    <div>
                                        <InputLabel htmlFor="chat_space_name" required>
                                            Nama Chat Space
                                        </InputLabel>
                                        <input
                                            id="chat_space_name"
                                            type="text"
                                            value={chatSpaceForm.data.name}
                                            onChange={(e) => chatSpaceForm.setData('name', e.target.value)}
                                            className="input-field mt-1"
                                            placeholder="misalnya, Diskusi BAB 1"
                                        />
                                        <InputError message={chatSpaceForm.errors.name} />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowChatSpaceModal(null)}
                                            className="btn-secondary flex-1"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={chatSpaceForm.processing}
                                            className="btn-primary flex-1"
                                        >
                                            {chatSpaceForm.processing ? 'Membuat...' : 'Buat'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Group Confirmation Modal */}
            <AnimatePresence>
                {deleteGroupId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteGroupId(null)}
                            className="fixed inset-0 z-40 bg-black"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                        <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                            Hapus Grup
                                        </h3>
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            Apakah Anda yakin ingin menghapus grup ini? Semua anggota, sesi diskusi, dan data terkait akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                                        </p>
                                        <div className="mt-4 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setDeleteGroupId(null)}
                                                className="btn-secondary flex-1"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={handleDeleteGroup}
                                                disabled={deleteForm.processing}
                                                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                            >
                                                {deleteForm.processing ? 'Menghapus...' : 'Hapus Grup'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
