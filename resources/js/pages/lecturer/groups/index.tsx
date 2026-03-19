import { Head, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Check,
    Copy,
    FolderKanban,
    MessageSquare,
    Plus,
    Sparkles,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { CSSProperties, FormEvent, useMemo, useState } from 'react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { LiquidGlassCard, OrganicBlob, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { InputError } from '@/components/ui/input-error';
import { InputLabel } from '@/components/ui/input-label';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';
import { Course, User } from '@/types';

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

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const bodyTextClass = 'text-sm text-[#6B7280]';

const brandChipStyle = {
    background: 'rgba(136,22,28,0.08)',
    color: '#88161c',
    border: '1px solid rgba(136,22,28,0.15)',
} as const;

const neutralChipStyle = {
    background: 'rgba(74,74,74,0.08)',
    color: '#4A4A4A',
    border: '1px solid rgba(74,74,74,0.12)',
} as const;

const warningChipStyle = {
    background: 'rgba(245,158,11,0.10)',
    color: '#92400e',
    border: '1px solid rgba(245,158,11,0.16)',
} as const;

const glassPanelStyle = {
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.65)',
} as const;

const modalBackdropClass = 'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm';

const getGoalChipStyle = (group: GroupWithDetails): CSSProperties => {
    if (group.has_goal) {
        return {
            background: 'rgba(34,197,94,0.10)',
            color: '#166534',
            border: '1px solid rgba(34,197,94,0.18)',
        };
    }

    return warningChipStyle;
};

export default function GroupsIndex({ course, groups, students }: Props) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
    const [showChatSpaceModal, setShowChatSpaceModal] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
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

    const handleCreateGroup = (event: FormEvent) => {
        event.preventDefault();
        createForm.post(lecturer.groups.store.url({ course: course.id }), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const handleAssignMembers = (event: FormEvent) => {
        event.preventDefault();
        if (!showAssignModal) return;

        assignForm.post(lecturer.groups.members.store.url({ course: course.id, group: showAssignModal }), {
            onSuccess: () => {
                setShowAssignModal(null);
                assignForm.reset();
            },
        });
    };

    const handleCreateChatSpace = (event: FormEvent) => {
        event.preventDefault();
        if (!showChatSpaceModal) return;

        chatSpaceForm.post(`/lecturer/groups/${showChatSpaceModal}/chat-spaces`, {
            onSuccess: () => {
                setShowChatSpaceModal(null);
                chatSpaceForm.reset();
            },
        });
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
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const assignedStudentIds = useMemo(() => groups.flatMap((group) => group.members?.map((member) => member.id) || []), [groups]);
    const unassignedStudents = useMemo(
        () => students.filter((student) => !assignedStudentIds.includes(student.id)),
        [assignedStudentIds, students],
    );

    const selectedGroup = useMemo(
        () => groups.find((group) => group.id === showAssignModal) ?? null,
        [groups, showAssignModal],
    );

    const deleteGroup = useMemo(
        () => groups.find((group) => group.id === deleteGroupId) ?? null,
        [deleteGroupId, groups],
    );

    const totalMembers = groups.reduce((sum, group) => sum + (group.members?.length || 0), 0);
    const totalChatSpaces = groups.reduce((sum, group) => sum + (group.chatSpaces?.length || 0), 0);
    const groupsWithGoals = groups.filter((group) => group.has_goal).length;

    return (
        <AppLayout title={`Grup - ${course.name}`} navItems={navItems}>
            <Head title={`Grup - ${course.name}`} />

            <div className="relative">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={300} />
                <OrganicBlob className="top-36 -right-16" delay={-5} color="rgba(136, 22, 28, 0.03)" size={240} />

                <div className="relative space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <LiquidGlassCard intensity="medium" className="p-6 sm:p-8" lightMode={true}>
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={brandChipStyle}>
                                            {course.code}
                                        </span>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={neutralChipStyle}>
                                            {groups.length} grup aktif
                                        </span>
                                    </div>

                                    <h1 className="mt-3 text-2xl font-bold sm:text-3xl" style={headingStyle}>
                                        Orkestrasi Grup Mahasiswa
                                    </h1>
                                    <p className={`mt-2 max-w-2xl ${bodyTextClass}`}>
                                        Atur pembagian kelompok, sesi diskusi, dan penugasan mahasiswa dengan bahasa visual yang sama
                                        seperti halaman student rollout dan wave dosen sebelumnya.
                                    </p>
                                </div>

                                <PrimaryButton onClick={() => setShowCreateModal(true)} className="justify-center">
                                    <Plus className="h-4 w-4" />
                                    Tambah Grup
                                </PrimaryButton>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                label: 'Total Grup',
                                value: groups.length,
                                detail: 'Kelompok yang sudah dibuat',
                                icon: FolderKanban,
                                color: '#88161c',
                            },
                            {
                                label: 'Mahasiswa Tertugas',
                                value: totalMembers,
                                detail: 'Mahasiswa yang sudah masuk grup',
                                icon: Users,
                                color: '#4A4A4A',
                            },
                            {
                                label: 'Belum Ditugaskan',
                                value: unassignedStudents.length,
                                detail: 'Perlu dipetakan ke grup',
                                icon: UserPlus,
                                color: '#92400e',
                            },
                            {
                                label: 'Chat Space Aktif',
                                value: totalChatSpaces,
                                detail: `${groupsWithGoals} grup sudah punya tujuan`,
                                icon: MessageSquare,
                                color: '#166534',
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
                                            <p className="text-sm text-[#6B7280]">{stat.label}</p>
                                            <p className="mt-2 text-3xl font-light" style={headingStyle}>
                                                {stat.value}
                                            </p>
                                            <p className="mt-1 text-xs text-[#6B7280]">{stat.detail}</p>
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

                    {groups.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <LiquidGlassCard intensity="medium" className="px-6 py-16 text-center" lightMode={true}>
                                <div
                                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <FolderKanban className="h-8 w-8" style={{ color: '#88161c' }} />
                                </div>
                                <h2 className="mt-5 text-xl font-semibold" style={headingStyle}>
                                    Belum ada grup di kelas ini
                                </h2>
                                <p className={`mx-auto mt-2 max-w-md ${bodyTextClass}`}>
                                    Mulai dengan membuat grup pertama, lalu tugaskan mahasiswa dan siapkan ruang diskusi untuk setiap tim.
                                </p>
                                <div className="mt-6 flex justify-center">
                                    <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                        <Plus className="h-4 w-4" />
                                        Tambah Grup
                                    </PrimaryButton>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                            {groups.map((group, index) => {
                                const memberCount = group.members?.length || 0;
                                const chatSpaceCount = group.chatSpaces?.length || 0;

                                return (
                                    <motion.div
                                        key={group.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <LiquidGlassCard intensity="light" className="h-full p-6" lightMode={true}>
                                            <div className="flex h-full flex-col gap-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span
                                                                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-base font-semibold"
                                                                style={brandChipStyle}
                                                            >
                                                                {group.name.charAt(0).toUpperCase()}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <h2 className="truncate text-lg font-semibold" style={headingStyle}>
                                                                    {group.name}
                                                                </h2>
                                                                <p className="text-sm text-[#6B7280]">
                                                                    {memberCount} anggota • {chatSpaceCount} sesi diskusi
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedGroupJoinCode(group.joinCode)}
                                                            className="rounded-full p-2 transition-colors"
                                                            style={glassPanelStyle}
                                                            title="Lihat kode grup"
                                                        >
                                                            <Copy className="h-4 w-4" style={{ color: '#4A4A4A' }} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteGroupId(group.id)}
                                                            className="rounded-full p-2 transition-colors"
                                                            style={{
                                                                background: 'rgba(239,68,68,0.10)',
                                                                border: '1px solid rgba(239,68,68,0.16)',
                                                            }}
                                                            title="Hapus grup"
                                                        >
                                                            <Trash2 className="h-4 w-4" style={{ color: '#b91c1c' }} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={neutralChipStyle}>
                                                        Kode {group.joinCode}
                                                    </span>
                                                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={getGoalChipStyle(group)}>
                                                        {group.has_goal ? 'Tujuan tersedia' : 'Belum ada tujuan'}
                                                    </span>
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-2xl p-4" style={glassPanelStyle}>
                                                        <div className="flex items-center gap-2">
                                                            <MessageSquare className="h-4 w-4" style={{ color: '#88161c' }} />
                                                            <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>
                                                                Sesi Diskusi
                                                            </p>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {group.chatSpaces && group.chatSpaces.length > 0 ? (
                                                                group.chatSpaces.map((space) => (
                                                                    <span
                                                                        key={space.id}
                                                                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                                                                        style={space.isDefault ? brandChipStyle : neutralChipStyle}
                                                                    >
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                                        {space.name}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-[#6B7280]">Belum ada sesi diskusi</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-2xl p-4" style={glassPanelStyle}>
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4" style={{ color: '#4A4A4A' }} />
                                                            <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>
                                                                Anggota Grup
                                                            </p>
                                                        </div>
                                                        <div className="mt-3 space-y-2">
                                                            {group.members && group.members.length > 0 ? (
                                                                group.members.slice(0, 4).map((member) => (
                                                                    <div key={member.id} className="flex items-center gap-2">
                                                                        <div
                                                                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium"
                                                                            style={brandChipStyle}
                                                                        >
                                                                            {member.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <span className="truncate text-sm text-[#4A4A4A]">{member.name}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-sm text-[#6B7280]">Belum ada anggota</p>
                                                            )}
                                                            {memberCount > 4 && (
                                                                <p className="text-xs text-[#6B7280]">+{memberCount - 4} mahasiswa lainnya</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-auto grid gap-3 sm:grid-cols-2">
                                                    <SecondaryButton onClick={() => setShowAssignModal(group.id)} className="justify-center">
                                                        <UserPlus className="h-4 w-4" />
                                                        Tugaskan Siswa
                                                    </SecondaryButton>
                                                    <PrimaryButton onClick={() => setShowChatSpaceModal(group.id)} className="justify-center">
                                                        <Plus className="h-4 w-4" />
                                                        Tambah Sesi Diskusi
                                                    </PrimaryButton>
                                                </div>
                                            </div>
                                        </LiquidGlassCard>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16 }}
                    >
                        <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                            style={{
                                                background: 'rgba(245,158,11,0.10)',
                                                border: '1px solid rgba(245,158,11,0.16)',
                                            }}
                                        >
                                            <Sparkles className="h-5 w-5" style={{ color: '#92400e' }} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold" style={headingStyle}>
                                                Mahasiswa yang belum ditugaskan
                                            </h2>
                                            <p className={`mt-1 ${bodyTextClass}`}>
                                                Pastikan semua mahasiswa masuk ke grup agar dapat mengakses alur diskusi dan tugas kolaboratif.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <span className="rounded-full px-3 py-1 text-xs font-medium" style={warningChipStyle}>
                                    {unassignedStudents.length} mahasiswa belum ditugaskan
                                </span>
                            </div>

                            {unassignedStudents.length > 0 ? (
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {unassignedStudents.map((student) => (
                                        <span
                                            key={student.id}
                                            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
                                            style={glassPanelStyle}
                                        >
                                            <span
                                                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                                                style={brandChipStyle}
                                            >
                                                {student.name.charAt(0).toUpperCase()}
                                            </span>
                                            <span style={{ color: '#4A4A4A' }}>{student.name}</span>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-5 rounded-[28px] px-6 py-10 text-center" style={glassPanelStyle}>
                                    <div
                                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                                        style={{
                                            background: 'rgba(34,197,94,0.10)',
                                            border: '1px solid rgba(34,197,94,0.18)',
                                        }}
                                    >
                                        <Check className="h-8 w-8" style={{ color: '#166534' }} />
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold" style={headingStyle}>
                                        Semua mahasiswa sudah tertugaskan
                                    </h3>
                                    <p className={`mx-auto mt-2 max-w-md ${bodyTextClass}`}>
                                        Tidak ada mahasiswa yang tertinggal. Anda bisa fokus pada pengelolaan diskusi dan kualitas kolaborasi.
                                    </p>
                                </div>
                            )}
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {showCreateModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className={modalBackdropClass}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-md p-6" lightMode={true}>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold" style={headingStyle}>
                                            Buat Grup Baru
                                        </h3>
                                        <p className={`mt-1 ${bodyTextClass}`}>
                                            Kode unik akan dibuat otomatis untuk mahasiswa bergabung.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-full p-2 transition-colors"
                                        style={glassPanelStyle}
                                    >
                                        <X className="h-4 w-4" style={{ color: '#4A4A4A' }} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateGroup} className="mt-6 space-y-4">
                                    <div>
                                        <InputLabel htmlFor="group_name" required>
                                            Nama Grup
                                        </InputLabel>
                                        <input
                                            id="group_name"
                                            type="text"
                                            value={createForm.data.name}
                                            onChange={(event) => createForm.setData('name', event.target.value)}
                                            className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30 sm:text-sm sm:leading-6"
                                            placeholder="misalnya, Grup A"
                                        />
                                        <InputError message={createForm.errors.name} />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <SecondaryButton onClick={() => setShowCreateModal(false)} className="flex-1 justify-center">
                                            Batal
                                        </SecondaryButton>
                                        <PrimaryButton disabled={createForm.processing} className="flex-1 justify-center">
                                            {createForm.processing ? 'Membuat...' : 'Buat'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAssignModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAssignModal(null)}
                            className={modalBackdropClass}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-lg p-6" lightMode={true}>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold" style={headingStyle}>
                                            Tugaskan Mahasiswa
                                        </h3>
                                        <p className={`mt-1 ${bodyTextClass}`}>
                                            {selectedGroup ? `Pilih mahasiswa untuk dimasukkan ke ${selectedGroup.name}.` : 'Pilih mahasiswa untuk dimasukkan ke grup ini.'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(null)}
                                        className="rounded-full p-2 transition-colors"
                                        style={glassPanelStyle}
                                    >
                                        <X className="h-4 w-4" style={{ color: '#4A4A4A' }} />
                                    </button>
                                </div>

                                <form onSubmit={handleAssignMembers} className="mt-6 space-y-4">
                                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                                        {unassignedStudents.length === 0 ? (
                                            <div className="rounded-[28px] px-6 py-10 text-center" style={glassPanelStyle}>
                                                <div
                                                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                                                    style={{
                                                        background: 'rgba(34,197,94,0.10)',
                                                        border: '1px solid rgba(34,197,94,0.18)',
                                                    }}
                                                >
                                                    <Check className="h-7 w-7" style={{ color: '#166534' }} />
                                                </div>
                                                <p className="mt-4 text-sm font-medium" style={{ color: '#4A4A4A' }}>
                                                    Semua mahasiswa telah ditugaskan
                                                </p>
                                            </div>
                                        ) : (
                                            unassignedStudents.map((student) => {
                                                const checked = assignForm.data.member_ids.includes(student.id);

                                                return (
                                                    <label
                                                        key={student.id}
                                                        className="flex cursor-pointer items-center gap-3 rounded-2xl p-4 transition-all"
                                                        style={{
                                                            background: checked ? 'rgba(136,22,28,0.10)' : 'rgba(255,255,255,0.55)',
                                                            border: checked
                                                                ? '1px solid rgba(136,22,28,0.18)'
                                                                : '1px solid rgba(255,255,255,0.7)',
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleMember(student.id)}
                                                            className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                                                        />
                                                        <div
                                                            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium"
                                                            style={checked ? brandChipStyle : neutralChipStyle}
                                                        >
                                                            {student.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm" style={{ color: '#4A4A4A' }}>
                                                            {student.name}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>

                                    <InputError message={assignForm.errors.member_ids} />

                                    <div className="flex gap-3 pt-2">
                                        <SecondaryButton onClick={() => setShowAssignModal(null)} className="flex-1 justify-center">
                                            Batal
                                        </SecondaryButton>
                                        <PrimaryButton
                                            disabled={assignForm.processing || assignForm.data.member_ids.length === 0}
                                            className="flex-1 justify-center"
                                        >
                                            {assignForm.processing ? 'Menugaskan...' : 'Tugaskan'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedGroupJoinCode && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedGroupJoinCode(null)}
                            className={modalBackdropClass}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-sm p-6 text-center" lightMode={true}>
                                <div
                                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <Copy className="h-6 w-6" style={{ color: '#88161c' }} />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold" style={headingStyle}>
                                    Kode Bergabung Grup
                                </h3>
                                <p className={`mt-2 ${bodyTextClass}`}>
                                    Bagikan kode ini kepada mahasiswa untuk masuk ke grup yang tepat.
                                </p>

                                <div className="my-6 rounded-[28px] px-4 py-6" style={glassPanelStyle}>
                                    <span className="font-mono text-3xl font-semibold tracking-[0.35em]" style={{ color: '#88161c' }}>
                                        {selectedGroupJoinCode}
                                    </span>
                                </div>

                                <PrimaryButton onClick={() => copyJoinCode(selectedGroupJoinCode)} className="w-full justify-center">
                                    {copiedCode === selectedGroupJoinCode ? (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Tersalin!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Salin Kode
                                        </>
                                    )}
                                </PrimaryButton>
                                <button
                                    type="button"
                                    onClick={() => setSelectedGroupJoinCode(null)}
                                    className="mt-3 w-full text-sm text-[#6B7280] transition-colors hover:text-[#4A4A4A]"
                                >
                                    Tutup
                                </button>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showChatSpaceModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowChatSpaceModal(null)}
                            className={modalBackdropClass}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-md p-6" lightMode={true}>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold" style={headingStyle}>
                                            Buat Chat Space Baru
                                        </h3>
                                        <p className={`mt-1 ${bodyTextClass}`}>
                                            Tambahkan ruang diskusi terpisah di dalam grup untuk topik tertentu.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowChatSpaceModal(null)}
                                        className="rounded-full p-2 transition-colors"
                                        style={glassPanelStyle}
                                    >
                                        <X className="h-4 w-4" style={{ color: '#4A4A4A' }} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateChatSpace} className="mt-6 space-y-4">
                                    <div>
                                        <InputLabel htmlFor="chat_space_name" required>
                                            Nama Chat Space
                                        </InputLabel>
                                        <input
                                            id="chat_space_name"
                                            type="text"
                                            value={chatSpaceForm.data.name}
                                            onChange={(event) => chatSpaceForm.setData('name', event.target.value)}
                                            className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30 sm:text-sm sm:leading-6"
                                            placeholder="misalnya, Diskusi BAB 1"
                                        />
                                        <InputError message={chatSpaceForm.errors.name} />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <SecondaryButton onClick={() => setShowChatSpaceModal(null)} className="flex-1 justify-center">
                                            Batal
                                        </SecondaryButton>
                                        <PrimaryButton disabled={chatSpaceForm.processing} className="flex-1 justify-center">
                                            {chatSpaceForm.processing ? 'Membuat...' : 'Buat'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteGroupId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteGroupId(null)}
                            className={modalBackdropClass}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <LiquidGlassCard intensity="heavy" className="w-full max-w-md p-6" lightMode={true}>
                                <div className="flex items-start gap-4">
                                    <div
                                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                        style={{
                                            background: 'rgba(239,68,68,0.10)',
                                            border: '1px solid rgba(239,68,68,0.16)',
                                        }}
                                    >
                                        <AlertTriangle className="h-6 w-6" style={{ color: '#b91c1c' }} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold" style={headingStyle}>
                                            Hapus Grup
                                        </h3>
                                        <p className={`mt-2 ${bodyTextClass}`}>
                                            {deleteGroup
                                                ? `Anda akan menghapus ${deleteGroup.name}. Semua anggota, sesi diskusi, dan data terkait akan hilang permanen.`
                                                : 'Semua anggota, sesi diskusi, dan data terkait akan dihapus secara permanen.'}
                                        </p>

                                        <div className="mt-5 flex gap-3">
                                            <SecondaryButton onClick={() => setDeleteGroupId(null)} className="flex-1 justify-center">
                                                Batal
                                            </SecondaryButton>
                                            <button
                                                type="button"
                                                onClick={handleDeleteGroup}
                                                disabled={deleteForm.processing}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(220,38,38,0.92) 0%, rgba(185,28,28,0.96) 100%)',
                                                    boxShadow: '0 10px 30px rgba(185,28,28,0.28)',
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {deleteForm.processing ? 'Menghapus...' : 'Hapus Grup'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
