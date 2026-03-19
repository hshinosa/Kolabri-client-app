import { Head, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { FormEvent } from 'react';

import { useLecturerNav } from '@/components/navigation/lecturer-nav';
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

            <div className="mx-auto max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6"
                >
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                            Buat Kelas Baru
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Siapkan kelas baru untuk siswa Anda
                        </p>
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
                                className="input-field mt-1"
                                placeholder="misalnya, CS401"
                                maxLength={50}
                            />
                            <p className="mt-1 text-xs text-zinc-500">
                                Pengenal unik untuk kelas Anda
                            </p>
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
                                className="input-field mt-1"
                                placeholder="misalnya, Interaksi Manusia-Komputer"
                                maxLength={255}
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                            >
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
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card mt-6 bg-primary-50 p-4 dark:bg-primary-900/20"
                >
                    <div className="flex gap-3">
                        <svg className="h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-primary-800 dark:text-primary-200">
                            <p className="font-medium">Apa yang terjadi selanjutnya?</p>
                            <p className="mt-1 text-primary-700 dark:text-primary-300">
                                Setelah membuat kelas, Anda akan mendapatkan kode bergabung unik yang dapat digunakan siswa untuk mendaftar.
                                Anda juga dapat mengunggah materi kelas dan membuat grup siswa.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AppLayout>
    );
}
