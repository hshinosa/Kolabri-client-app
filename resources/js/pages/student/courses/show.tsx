import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { MessageSquare, Pencil, Sparkles, Users } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { useStudentNav } from '@/components/navigation/student-nav';
import { Course, LearningGoal } from '@/types';
import student from '@/routes/student';
import { LiquidGlassCard, OrganicBlob } from '@/components/Welcome/utils/helpers';

interface Group {
    id: string;
    name: string;
    joinCode: string;
}

interface Props {
    course: Course;
    group: Group | null;
    goal: LearningGoal | null;
    hasGroup: boolean;
    hasGoal: boolean;
}

export default function StudentCourseShow({ course, group, hasGroup }: Props) {
    const navItems = useStudentNav('course-detail', { courseId: course.id });

    return (
        <AppLayout title={course.name} navItems={navItems}>
            <Head title={course.name} />

            <div className="relative">
                {/* Background decorative blobs */}
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={300} />
                <OrganicBlob className="top-40 -right-20" delay={-5} color="rgba(136, 22, 28, 0.03)" size={250} />

                <div className="relative space-y-6">
                    {/* Course Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <div className="flex items-center gap-2">
                                <span 
                                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                                    style={{ 
                                        background: 'rgba(136,22,28,0.10)', 
                                        color: '#88161c',
                                        border: '1px solid rgba(136,22,28,0.15)'
                                    }}
                                >
                                    {course.code}
                                </span>
                            </div>
                            <h2 
                                className="mt-3 text-2xl font-bold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                {course.name}
                            </h2>
                            <p className="mt-1 text-sm text-[#6B7280]">
                                Dosen: {course.owner?.name || 'Tidak Diketahui'}
                            </p>
                        </LiquidGlassCard>
                    </motion.div>

                    {/* Group Status */}
                    {!hasGroup ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <LiquidGlassCard intensity="light" className="p-6" lightMode={true}>
                                <div className="flex items-start gap-4">
                                    <div 
                                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                        style={{ 
                                            background: 'rgba(136,22,28,0.08)', 
                                            border: '1px solid rgba(136,22,28,0.12)' 
                                        }}
                                    >
                                        <Users className="h-6 w-6" style={{ color: '#88161c' }} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 
                                            className="text-lg font-semibold"
                                            style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                        >
                                            Belum Bergabung dengan Grup
                                        </h3>
                                        <p className="mt-1 text-sm text-[#6B7280]">
                                            Anda belum tergabung dalam grup diskusi. Bergabung dengan grup untuk mulai berdiskusi dengan tim Anda.
                                        </p>
                                        <Link
                                            href={student.groups.index.url({ course: course.id })}
                                            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition-all"
                                            style={{ 
                                                background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                boxShadow: '0 8px 32px rgba(136,22,28,0.35)'
                                            }}
                                        >
                                            Cari atau Buat Grup
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    ) : (
                        <>
                            {/* Group Info Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                                                style={{ 
                                                    background: 'rgba(136,22,28,0.08)', 
                                                    border: '1px solid rgba(136,22,28,0.12)' 
                                                }}
                                            >
                                                <Users className="h-6 w-6" style={{ color: '#88161c' }} />
                                            </div>
                                            <div>
                                                <h3 
                                                    className="text-lg font-semibold"
                                                    style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                                >
                                                    {group?.name}
                                                </h3>
                                                <p className="text-sm text-[#6B7280]">Grup Anda</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={student.courses.chatSpaces.url({ course: course.id })}
                                            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition-all"
                                            style={{ 
                                                background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                boxShadow: '0 8px 32px rgba(136,22,28,0.35)'
                                            }}
                                        >
                                            <MessageSquare className="h-5 w-5" />
                                            Buka Diskusi
                                        </Link>
                                    </div>
                                </LiquidGlassCard>
                            </motion.div>

                            {/* Quick Actions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="grid gap-4 sm:grid-cols-2"
                            >
                                <Link
                                    href={student.reflections.index.url()}
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
                                            background: 'rgba(74,74,74,0.10)',
                                            border: '1px solid rgba(74,74,74,0.15)'
                                        }}
                                    >
                                        <Pencil className="h-6 w-6" style={{ color: '#4A4A4A' }} />
                                    </div>
                                    <div>
                                        <h4 
                                            className="font-medium"
                                            style={{ color: '#4A4A4A' }}
                                        >
                                            Refleksi
                                        </h4>
                                        <p className="text-sm text-[#6B7280]">Catat refleksi belajar Anda</p>
                                    </div>
                                </Link>

                                <Link
                                    href={student.aiChat.index.url()}
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
                                            background: 'rgba(136,22,28,0.10)',
                                            border: '1px solid rgba(136,22,28,0.15)'
                                        }}
                                    >
                                        <Sparkles className="h-6 w-6" style={{ color: '#88161c' }} />
                                    </div>
                                    <div>
                                        <h4 
                                            className="font-medium"
                                            style={{ color: '#4A4A4A' }}
                                        >
                                            Asisten AI
                                        </h4>
                                        <p className="text-sm text-[#6B7280]">Tanya jawab dengan AI</p>
                                    </div>
                                </Link>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
