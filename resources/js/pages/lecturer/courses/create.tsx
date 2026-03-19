import { Head, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { BookOpen, Info } from 'lucide-react';
import { FormEvent } from 'react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
import { LiquidGlassCard, OrganicBlob, PrimaryButton } from '@/components/Welcome/utils/helpers';
import { InputError } from '@/components/ui/input-error';
import { InputLabel } from '@/components/ui/input-label';
import AppLayout from '@/layouts/app-layout';
import lecturer from '@/routes/lecturer';

export default function CreateCourse() {
    const navItems = useLecturerNav('course-create');
    const { data, setData, post, processing, errors } = useForm({
        code: '',
        name: '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(lecturer.courses.store.url());
    };

    return (
        <AppLayout title="Buat Kelas" navItems={navItems}>
            <Head title="Buat Kelas" />

            <div className="relative mx-auto max-w-3xl">
                <OrganicBlob className="top-0 -left-20" delay={0} color="rgba(136, 22, 28, 0.04)" size={260} />
                <OrganicBlob className="top-32 -right-16" delay={-5} color="rgba(136, 22, 28, 0.03)" size={220} />

                <div className="relative space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <LiquidGlassCard intensity="medium" className="p-6 sm:p-8" lightMode={true}>
                            <div className="mb-6 flex items-start gap-4">
                                <div
                                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <BookOpen className="h-7 w-7" style={{ color: '#88161c' }} />
                                </div>
                                <div>
                                    <h2
                                        className="text-xl font-semibold sm:text-2xl"
                                        style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                    >
                                        Buat Kelas Baru
                                    </h2>
                                    <p className="mt-1 text-sm text-[#6B7280] sm:text-base">
                                        Siapkan kelas baru untuk siswa Anda.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <InputLabel htmlFor="code" required>
                                        Kode Kelas
                                    </InputLabel>
                                    <input
                                        id="code"
                                        type="text"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 font-mono tracking-wider text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30 sm:text-sm sm:leading-6"
                                        placeholder="misalnya, CS401"
                                        maxLength={50}
                                    />
                                    <p className="mt-2 text-xs text-[#6B7280]">Pengenal unik untuk kelas Anda</p>
                                    <InputError message={errors.code} />
                                </div>

                                <div>
                                    <InputLabel htmlFor="name" required>
                                        Nama Kelas
                                    </InputLabel>
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-[#4A4A4A] shadow-sm ring-1 ring-inset ring-white/50 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-[#88161c]/30 sm:text-sm sm:leading-6"
                                        placeholder="misalnya, Interaksi Manusia-Komputer"
                                        maxLength={255}
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="pt-2">
                                    <PrimaryButton disabled={processing} className="w-full justify-center sm:w-auto">
                                        {processing ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Creating...
                                            </span>
                                        ) : (
                                            'Buat Kelas'
                                        )}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </LiquidGlassCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                    >
                        <LiquidGlassCard intensity="light" className="p-5" lightMode={true}>
                            <div className="flex items-start gap-3">
                                <div
                                    className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                    style={{
                                        background: 'rgba(136,22,28,0.08)',
                                        border: '1px solid rgba(136,22,28,0.12)',
                                    }}
                                >
                                    <Info className="h-5 w-5" style={{ color: '#88161c' }} />
                                </div>
                                <div>
                                    <p
                                        className="font-medium"
                                        style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                    >
                                        Apa yang terjadi selanjutnya?
                                    </p>
                                    <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">
                                        Setelah membuat kelas, Anda akan mendapatkan kode bergabung unik yang dapat digunakan siswa untuk mendaftar.
                                        Anda juga dapat mengunggah materi kelas dan membuat grup siswa.
                                    </p>
                                </div>
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </div>
        </AppLayout>
    );
}
