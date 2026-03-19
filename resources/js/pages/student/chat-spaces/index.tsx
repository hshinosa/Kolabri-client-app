import { Head, Link, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, FormEvent } from 'react';
import { Lightbulb, Lock, MessageCircle, MessageSquare, Pencil, Plus, X } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { useStudentNav } from '@/components/navigation/student-nav';
import { Course } from '@/types';
import student from '@/routes/student';
import { room as chatRoom } from '@/routes/student/courses/chat';
import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';

interface ChatSpaceGoal {
    id: string;
    content: string;
    isValidated: boolean;
    createdBy: {
        id: string;
        name: string;
    };
    createdAt: string;
}

interface ChatSpace {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
    isClosed?: boolean;
    closedAt?: string;
    myGoal?: ChatSpaceGoal | null;
    createdAt?: string;
}

const isClosedChatSpace = (space: ChatSpace) => {
    return Boolean(space.isClosed || space.closedAt || (!space.isDefault && space.closedAt));
};

const getChatSpaceUrl = (courseId: string, chatSpace: ChatSpace): string => {
    const closed = isClosedChatSpace(chatSpace);
    if (closed) {
        return chatRoom.url({ course: courseId, chatSpace: chatSpace.id });
    }
    if (chatSpace.myGoal) {
        return chatRoom.url({ course: courseId, chatSpace: chatSpace.id });
    }
    return student.goals.create.url({ course: courseId, chatSpace: chatSpace.id });
};

interface GroupMember {
    id: string;
    name: string;
    email: string;
}

interface Group {
    id: string;
    name: string;
    joinCode: string;
    members?: GroupMember[];
    chatSpaces?: ChatSpace[];
}

interface Props {
    course: Course;
    group: Group;
}

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const bodyTextClass = 'text-sm text-[#6B7280]';

export default function ChatSpacesIndex({ course, group }: Props) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const navItems = useStudentNav('chat-spaces', { courseId: course.id });
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        description: '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(student.groups.chatSpaces.store.url({ group: group.id }), {
            onSuccess: () => {
                reset();
                setShowCreateModal(false);
            },
        });
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const chatSpaces = group.chatSpaces || [];

    return (
        <AppLayout title={`Diskusi - ${group.name}`} navItems={navItems}>
            <Head title={`Diskusi - ${course.name}`} />

            <div className="space-y-6">
                <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1
                                className="text-2xl font-bold"
                                style={headingStyle}
                            >
                                Sesi Diskusi
                            </h1>
                            <p className={`mt-1 ${bodyTextClass}`}>
                                {course.name} • Grup: {group.name}
                            </p>
                        </div>
                        <PrimaryButton onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4" />
                            Sesi Baru
                        </PrimaryButton>
                    </div>
                </LiquidGlassCard>

                {chatSpaces.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {chatSpaces.map((chatSpace) => {
                                const closed = isClosedChatSpace(chatSpace);
                                const dateSource = closed ? chatSpace.closedAt : chatSpace.createdAt;
                                const formattedDate = formatDate(dateSource);
                                const dateLabel = formattedDate ? `${closed ? 'Ditutup' : 'Dibuat'} ${formattedDate}` : '';
                                return (
                                    <Link
                                        key={chatSpace.id}
                                        href={getChatSpaceUrl(course.id, chatSpace)}
                                        className="group block"
                                    >
                                        <LiquidGlassCard
                                            intensity="light"
                                            className="p-5 transition-all duration-300 group-hover:shadow-lg"
                                            lightMode={true}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                                                    style={{
                                                        background: closed
                                                            ? 'rgba(107,114,128,0.08)'
                                                            : 'rgba(136,22,28,0.08)',
                                                        border: closed
                                                            ? '1px solid rgba(107,114,128,0.12)'
                                                            : '1px solid rgba(136,22,28,0.12)',
                                                        color: closed ? '#6B7280' : '#88161c',
                                                    }}
                                                >
                                                    {closed ? (
                                                        <Lock className="h-5 w-5" />
                                                    ) : (
                                                        <MessageSquare className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3
                                                        className="font-semibold truncate"
                                                        style={{
                                                            color: closed ? '#6B7280' : '#4A4A4A',
                                                        }}
                                                    >
                                                        {chatSpace.name}
                                                    </h3>
                                                    {chatSpace.description && (
                                                        <p className="mt-0.5 text-xs text-[#6B7280] line-clamp-2">
                                                            {chatSpace.description}
                                                        </p>
                                                    )}
                                                    {dateLabel && (
                                                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                                                            {dateLabel}
                                                        </p>
                                                    )}
                                                    <div className="mt-2 flex items-center gap-2">
                                                        {closed ? (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                                                style={{
                                                                    background: 'rgba(107,114,128,0.08)',
                                                                    color: '#6B7280',
                                                                    border: '1px solid rgba(107,114,128,0.15)',
                                                                }}
                                                            >
                                                                <Lock className="h-3 w-3" />
                                                                Sesi Ditutup
                                                            </span>
                                                        ) : chatSpace.myGoal ? (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                                                style={{
                                                                    background: 'rgba(136,22,28,0.08)',
                                                                    color: '#88161c',
                                                                    border: '1px solid rgba(136,22,28,0.15)',
                                                                }}
                                                            >
                                                                <MessageCircle className="h-3 w-3" />
                                                                Masuk Diskusi
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                                                style={{
                                                                    background: 'rgba(245,158,11,0.08)',
                                                                    color: '#92400e',
                                                                    border: '1px solid rgba(245,158,11,0.15)',
                                                                }}
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                                Tetapkan Tujuan
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <svg
                                                    className="h-5 w-5 flex-shrink-0 transition-transform group-hover:translate-x-1"
                                                    style={{ color: closed ? '#6B7280' : '#88161c' }}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </LiquidGlassCard>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {chatSpaces.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
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
                                <MessageSquare className="h-8 w-8" style={{ color: '#88161c' }} />
                            </div>
                            <h3
                                className="text-lg font-semibold"
                                style={headingStyle}
                            >
                                Belum Ada Sesi Diskusi
                            </h3>
                            <p className={`mt-2 max-w-sm ${bodyTextClass}`}>
                                Buat sesi diskusi baru untuk mulai belajar bersama.
                            </p>
                            <div className="mt-6">
                                <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                    <Plus className="h-4 w-4" />
                                    Buat Sesi Pertama
                                </PrimaryButton>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                        <div className="flex items-start gap-4">
                            <div
                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                                style={{
                                    background: 'rgba(136,22,28,0.08)',
                                    border: '1px solid rgba(136,22,28,0.12)',
                                }}
                            >
                                <Lightbulb className="h-5 w-5" style={{ color: '#88161c' }} />
                            </div>
                            <div>
                                <p className="text-base font-semibold" style={headingStyle}>
                                    Tips: Gunakan Sesi Terpisah
                                </p>
                                <p className={`mt-2 leading-6 ${bodyTextClass}`}>
                                    Buat sesi diskusi terpisah untuk topik berbeda agar diskusi lebih terfokus.
                                    Setiap sesi memiliki tujuan pembelajaran sendiri.
                                </p>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </motion.div>
            </div>

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
                                    <div>
                                        <h3
                                            className="text-lg font-semibold"
                                            style={headingStyle}
                                        >
                                            Buat Sesi Diskusi Baru
                                        </h3>
                                        <p className={`mt-1 ${bodyTextClass}`}>
                                            Buat sesi diskusi baru untuk topik tertentu.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-white/50 hover:text-[#4A4A4A]"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                    <div>
                                        <label
                                            className="block text-sm font-medium text-[#4A4A4A]"
                                        >
                                            Nama Sesi <span style={{ color: '#88161c' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Contoh: Diskusi Bab 3"
                                            className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30 sm:text-sm sm:leading-6"
                                            required
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            className="block text-sm font-medium text-[#4A4A4A]"
                                        >
                                            Deskripsi (Opsional)
                                        </label>
                                        <textarea
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Jelaskan topik yang akan dibahas..."
                                            rows={3}
                                            className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <SecondaryButton
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1"
                                        >
                                            Batal
                                        </SecondaryButton>
                                        <PrimaryButton
                                            disabled={processing || !data.name.trim()}
                                            className="flex-1"
                                        >
                                            {processing ? 'Membuat...' : 'Buat Sesi'}
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
