import { Head, Link, useForm, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Info, Lightbulb } from 'lucide-react';
import { FormEvent, useState, useMemo } from 'react';

import { InputError } from '@/components/ui/input-error';
import { InputLabel } from '@/components/ui/input-label';
import AppLayout from '@/layouts/app-layout';
import { useStudentNav } from '@/components/navigation/student-nav';
import { Course, Group } from '@/types';
import student from '@/routes/student';
import { room as chatRoom } from '@/routes/student/courses/chat';
import { LiquidGlassCard, PrimaryButton, SecondaryButton, OrganicBlob } from '@/components/Welcome/utils/helpers';

interface ChatSpace {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
}

interface Props {
    course: Course;
    group: Group | null;
    chatSpace: ChatSpace | null;
}

// Taksonomi Bloom - Kata kerja aksi berdasarkan tingkat (Bahasa Indonesia)
const ACTION_VERBS = {
    mengingat: ['mendefinisikan', 'mengidentifikasi', 'menyebutkan', 'mengenali', 'mengingat', 'menghafal', 'mendeskripsikan', 'menyatakan'],
    memahami: ['menjelaskan', 'merangkum', 'menafsirkan', 'mengklasifikasi', 'membandingkan', 'membedakan', 'mendiskusikan', 'mencontohkan'],
    menerapkan: ['menerapkan', 'mendemonstrasikan', 'mengimplementasikan', 'menyelesaikan', 'menggunakan', 'melaksanakan', 'mengilustrasikan', 'mempraktikkan'],
    menganalisis: ['menganalisis', 'membedakan', 'memeriksa', 'menguraikan', 'menyelidiki', 'mengorganisasi', 'menghubungkan', 'mengkritisi'],
    mengevaluasi: ['mengevaluasi', 'menilai', 'mengkritik', 'memutuskan', 'membenarkan', 'merekomendasikan', 'menyimpulkan', 'mempertahankan'],
    mencipta: ['menciptakan', 'merancang', 'mengembangkan', 'membangun', 'memproduksi', 'merencanakan', 'menyusun', 'menghasilkan'],
};

const LEVEL_LABELS = {
    mengingat: 'Mengingat',
    memahami: 'Memahami',
    menerapkan: 'Menerapkan',
    menganalisis: 'Menganalisis',
    mengevaluasi: 'Mengevaluasi',
    mencipta: 'Mencipta',
};

const LEVEL_COLORS = {
    mengingat: 'bg-[rgba(136,22,28,0.08)] text-[#6B7280] border-[rgba(136,22,28,0.12)]',
    memahami: 'bg-[rgba(136,22,28,0.10)] text-[#88161c] border-[rgba(136,22,28,0.15)]',
    menerapkan: 'bg-[rgba(136,22,28,0.12)] text-[#88161c] border-[rgba(136,22,28,0.18)]',
    menganalisis: 'bg-[rgba(136,22,28,0.14)] text-[#88161c] border-[rgba(136,22,28,0.20)]',
    mengevaluasi: 'bg-[rgba(136,22,28,0.16)] text-[#88161c] border-[rgba(136,22,28,0.22)]',
    mencipta: 'bg-[rgba(136,22,28,0.18)] text-[#88161c] border-[rgba(136,22,28,0.25)]',
};

export default function StudentGoalCreate({ course, group, chatSpace }: Props) {
    const [selectedVerb, setSelectedVerb] = useState<string | null>(null);

    const navItems = useStudentNav('goals', { courseId: course.id });

    const { data, setData, post, processing, errors } = useForm({
        chat_space_id: chatSpace?.id || '',
        content: '',
    });

    // Detect Bloom's level from goal content
    const detectedLevel = useMemo(() => {
        const content = data.content.toLowerCase();
        for (const [level, verbs] of Object.entries(ACTION_VERBS)) {
            for (const verb of verbs) {
                if (content.includes(verb)) {
                    return level as keyof typeof ACTION_VERBS;
                }
            }
        }
        return null;
    }, [data.content]);

    const handleVerbClick = (verb: string) => {
        setSelectedVerb(verb);
        const capitalizedVerb = verb.charAt(0).toUpperCase() + verb.slice(1);
        if (!data.content) {
            setData('content', `${capitalizedVerb} `);
        } else {
            // Replace first word if it's a verb
            const words = data.content.split(' ');
            const allVerbs = Object.values(ACTION_VERBS).flat();
            if (allVerbs.includes(words[0].toLowerCase())) {
                words[0] = capitalizedVerb;
                setData('content', words.join(' '));
            } else {
                setData('content', `${capitalizedVerb} ${data.content}`);
            }
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(student.goals.store.url(), {
            onSuccess: () => {
                // Redirect langsung ke chat room setelah set goal
                if (chatSpace) {
                    router.visit(chatRoom.url({ course: course.id, chatSpace: chatSpace.id }));
                } else {
                    router.visit(student.courses.chatSpaces.url({ course: course.id }));
                }
            },
        });
    };

    // Check if student has a group
    if (!group) {
        return (
            <AppLayout title="Tetapkan Tujuan Pembelajaran" navItems={navItems}>
                <Head title="Tetapkan Tujuan Pembelajaran" />
                <div className="relative mx-auto max-w-3xl">
                    <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={250} />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-8 text-center" lightMode={true}>
                            <div className="mb-4 flex justify-center">
                                <div 
                                    className="flex h-16 w-16 items-center justify-center rounded-2xl"
                                    style={{ 
                                        background: 'rgba(136,22,28,0.08)', 
                                        border: '1px solid rgba(136,22,28,0.12)' 
                                    }}
                                >
                                    <AlertTriangle className="h-8 w-8" style={{ color: '#88161c' }} />
                                </div>
                            </div>
                            <h3 
                                className="text-xl font-semibold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Belum Ada Grup yang Ditugaskan
                            </h3>
                            <p className="mt-2 text-[#6B7280]">
                                Anda perlu ditugaskan ke grup sebelum dapat menetapkan tujuan pembelajaran.
                                Harap tunggu dosen Anda menugaskan Anda ke grup.
                            </p>
                            <Link
                                href={student.courses.show.url({ course: course.id })}
                                className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-all"
                                style={{ 
                                    background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                    boxShadow: '0 8px 32px rgba(136,22,28,0.35)'
                                }}
                            >
                                Kembali ke Kelas
                            </Link>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </AppLayout>
        );
    }

    // Check if chat space exists
    if (!chatSpace) {
        return (
            <AppLayout title="Tetapkan Tujuan Pembelajaran" navItems={navItems}>
                <Head title="Tetapkan Tujuan Pembelajaran" />
                <div className="relative mx-auto max-w-3xl">
                    <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={250} />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-8 text-center" lightMode={true}>
                            <div className="mb-4 flex justify-center">
                                <div 
                                    className="flex h-16 w-16 items-center justify-center rounded-2xl"
                                    style={{ 
                                        background: 'rgba(136,22,28,0.08)', 
                                        border: '1px solid rgba(136,22,28,0.12)' 
                                    }}
                                >
                                    <AlertTriangle className="h-8 w-8" style={{ color: '#88161c' }} />
                                </div>
                            </div>
                            <h3 
                                className="text-xl font-semibold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Chat Space Tidak Ditemukan
                            </h3>
                            <p className="mt-2 text-[#6B7280]">
                                Chat space yang Anda cari tidak ditemukan atau Anda tidak memiliki akses.
                            </p>
                            <Link
                                href={student.courses.chatSpaces.url({ course: course.id })}
                                className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-all"
                                style={{ 
                                    background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                    boxShadow: '0 8px 32px rgba(136,22,28,0.35)'
                                }}
                            >
                                Kembali ke Diskusi
                            </Link>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Tetapkan Tujuan Pembelajaran" navItems={navItems}>
            <Head title="Tetapkan Tujuan Pembelajaran" />

            <div className="relative mx-auto max-w-3xl">
                {/* Background decorative blobs */}
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={250} />
                <OrganicBlob className="top-40 -right-20" delay={-5} color="rgba(136, 22, 28, 0.03)" size={200} />

                <div className="relative space-y-6">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Link
                            href={student.courses.chatSpaces.url({ course: course.id })}
                            className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all"
                            style={{ 
                                background: 'rgba(255,255,255,0.6)', 
                                border: '1px solid rgba(255,255,255,0.8)',
                                color: '#6B7280'
                            }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Kembali ke Sesi Diskusi
                        </Link>
                        <h2 
                            className="text-2xl font-bold"
                            style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Tetapkan Tujuan Pembelajaran Anda
                        </h2>
                        <p className="mt-1 text-sm text-[#6B7280]">
                            Untuk chat space: <span className="font-medium" style={{ color: '#4A4A4A' }}>{chatSpace.name}</span>
                        </p>
                    </motion.div>

                    {/* Info Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                            <div className="flex gap-3">
                                <div 
                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                    style={{ 
                                        background: 'rgba(136,22,28,0.08)', 
                                        border: '1px solid rgba(136,22,28,0.12)' 
                                    }}
                                >
                                    <Info className="h-5 w-5" style={{ color: '#88161c' }} />
                                </div>
                                <div className="text-sm" style={{ color: '#4A4A4A' }}>
                                    <p className="font-medium">Apa yang membuat tujuan pembelajaran yang baik?</p>
                                    <ul className="mt-2 list-inside list-disc space-y-1 text-[#6B7280]">
                                        <li>Mulai dengan kata kerja aksi dari Taksonomi Bloom</li>
                                        <li>Jadilah spesifik tentang apa yang ingin Anda pelajari</li>
                                        <li>Buatlah dapat diukur sehingga Anda tahu kapan Anda telah mencapainya</li>
                                        <li>Jaga agar relevan dengan topik diskusi di chat space ini</li>
                                    </ul>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    {/* Action Verb Picker */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <h3 
                                className="text-lg font-semibold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Pilih Kata Kerja Aksi
                            </h3>
                            <p className="mt-1 text-sm text-[#6B7280]">
                                Klik pada kata kerja untuk memulai tujuan Anda. Tingkat yang lebih tinggi mendorong pembelajaran yang lebih dalam.
                            </p>
                            <div className="mt-4 space-y-4">
                                {Object.entries(ACTION_VERBS).map(([level, verbs]) => (
                                    <div key={level}>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span 
                                                className={`rounded-lg px-2.5 py-1 text-xs font-medium border ${LEVEL_COLORS[level as keyof typeof LEVEL_COLORS]}`}
                                            >
                                                {LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {verbs.map((verb) => (
                                                <button
                                                    key={verb}
                                                    type="button"
                                                    onClick={() => handleVerbClick(verb)}
                                                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
                                                        selectedVerb === verb
                                                            ? 'border-[rgba(136,22,28,0.25)] bg-[rgba(136,22,28,0.12)] text-[#88161c]'
                                                            : 'border-[rgba(0,0,0,0.08)] bg-white/80 text-[#4A4A4A] hover:border-[rgba(136,22,28,0.15)] hover:bg-[rgba(136,22,28,0.05)]'
                                                    }`}
                                                >
                                                    {verb.charAt(0).toUpperCase() + verb.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </LiquidGlassCard>
                    </motion.div>

                    {/* Goal Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <InputLabel htmlFor="content" required>
                                            <span style={{ color: '#4A4A4A' }}>Tujuan Pembelajaran Anda</span>
                                        </InputLabel>
                                        {detectedLevel && (
                                            <span 
                                                className="rounded-lg px-2.5 py-1 text-xs font-medium border"
                                                style={{
                                                    background: 'rgba(136,22,28,0.10)',
                                                    color: '#88161c',
                                                    borderColor: 'rgba(136,22,28,0.15)'
                                                }}
                                            >
                                                Tingkat: {LEVEL_LABELS[detectedLevel]}
                                            </span>
                                        )}
                                    </div>
                                    <textarea
                                        id="content"
                                        value={data.content}
                                        onChange={(e) => setData('content', e.target.value)}
                                        className="mt-2 w-full min-h-[120px] rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-3 text-sm text-[#374151] placeholder-[#9CA3AF] outline-none transition-all focus:border-[rgba(136,22,28,0.25)] focus:bg-white focus:ring-2 focus:ring-[rgba(136,22,28,0.08)]"
                                        placeholder="misalnya, Analisis pendekatan berbeda untuk normalisasi database dan evaluasi mana yang paling sesuai untuk aplikasi e-commerce"
                                        rows={4}
                                    />
                                    <InputError message={errors.content} />
                                    <p className="mt-1 text-xs text-[#6B7280]">
                                        {data.content.length}/500 karakter
                                    </p>
                                </div>

                                {/* Example Goals */}
                                <div 
                                    className="rounded-2xl border p-4"
                                    style={{ 
                                        background: 'rgba(255,255,255,0.55)', 
                                        borderColor: 'rgba(255,255,255,0.6)' 
                                    }}
                                >
                                    <div className="mb-3 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4" style={{ color: '#88161c' }} />
                                        <p 
                                            className="text-sm font-medium"
                                            style={{ color: '#4A4A4A' }}
                                        >
                                            Contoh Tujuan:
                                        </p>
                                    </div>
                                    <ul className="space-y-2 text-sm text-[#6B7280]">
                                        <li className="flex items-start gap-2">
                                            <span style={{ color: '#88161c' }}>•</span>
                                            <span>"<strong style={{ color: '#4A4A4A' }}>Membandingkan</strong> berbagai algoritma pengurutan dan menjelaskan kompleksitas waktunya"</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span style={{ color: '#88161c' }}>•</span>
                                            <span>"<strong style={{ color: '#4A4A4A' }}>Merancang</strong> RESTful API untuk aplikasi blog dengan autentikasi yang tepat"</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span style={{ color: '#88161c' }}>•</span>
                                            <span>"<strong style={{ color: '#4A4A4A' }}>Mengevaluasi</strong> kelebihan dan kekurangan SQL vs NoSQL untuk proyek kami"</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Link
                                        href={student.courses.chatSpaces.url({ course: course.id })}
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all"
                                        style={{ 
                                            background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 100%)',
                                            backdropFilter: 'blur(16px) saturate(180%)',
                                            border: '1px solid rgba(255,255,255,0.5)',
                                            color: '#4A4A4A'
                                        }}
                                    >
                                        Batal
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing || !data.content.trim()}
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ 
                                            background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                            boxShadow: '0 8px 32px rgba(136,22,28,0.35)'
                                        }}
                                    >
                                        {processing ? 'Menetapkan Tujuan...' : 'Tetapkan Tujuan & Mulai Diskusi'}
                                    </button>
                                </div>
                            </form>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </div>
        </AppLayout>
    );
}
