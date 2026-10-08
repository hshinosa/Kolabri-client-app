import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, ReactNode, useEffect } from 'react';
import { motion } from 'framer-motion';

import { InputError } from '@/components/ui/input-error';
import GuestLayout, { useTheme } from '@/layouts/guest-layout';
import { LiquidGlassCard, PrimaryButton } from '@/components/Welcome/utils/helpers';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';
import { setupCsrfRefresh, refreshCsrfToken } from '@/lib/csrfRefresh';

export default function Register() {
    const { lightMode } = useTheme();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'student' as 'student' | 'lecturer',
        terms: false as boolean,
    });

    useEffect(() => {
        const cleanup = setupCsrfRefresh(60);
        return cleanup;
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await refreshCsrfToken();
        post('/register', {
            // Registrasi langsung masuk (session regenerate) — segarkan token
            // CSRF meta seperti di login, cegah 419 pada interaksi pertama.
            onSuccess: () => {
                void refreshCsrfToken();
            },
        });
    };

    const inputStyles = {
        backgroundColor: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.6)',
        borderColor: lightMode ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
        color: lightMode ? '#1e293b' : '#f8fafc',
    };

    return (
        <>
            <Head title="Buat Akun" />

            <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
                <LiquidGlassCard intensity="medium" lightMode={lightMode} className="w-full p-8 sm:p-10 transition-colors duration-500">
                    <div className="mb-5 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--dm-text)]">
                            Buat Akun
                        </h1>
                        <p className="mt-1.5 text-sm text-[var(--dm-text-secondary)]">
                            Bergabunglah dengan Kolabri untuk memulai pembelajaran kolaboratif
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label 
                                htmlFor="name" 
                                className="block text-sm font-medium text-[var(--dm-text)]"
                            >
                                Nama Lengkap
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-2 w-full rounded-xl border px-4 py-3 shadow-brand-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                                style={inputStyles}
                                placeholder="Nama Anda"
                                autoComplete="name"
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div>
                            <label 
                                htmlFor="email" 
                                className="block text-sm font-medium text-[var(--dm-text)]"
                            >
                                Alamat Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="mt-2 w-full rounded-xl border px-4 py-3 shadow-brand-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                                style={inputStyles}
                                placeholder="anda@contoh.com"
                                autoComplete="email"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div>
                            <label 
                                htmlFor="role" 
                                className="block text-sm font-medium text-[var(--dm-text)]"
                            >
                                Saya adalah...
                            </label>
                            <div className="mt-1.5 flex gap-2">
                                <label className="flex flex-1 cursor-pointer items-center justify-center">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="student"
                                        checked={data.role === 'student'}
                                        onChange={(e) => setData('role', e.target.value as 'student')}
                                        className="sr-only"
                                    />
                                    <span
                                        className={`w-full rounded-lg border-2 px-3 py-2 text-center text-sm font-medium transition-all duration-300 ${
                                            data.role === 'student'
                                                ? 'border-brand-primary bg-brand-primary/5 text-brand-primary'
                                                : lightMode
                                                    ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                    : 'border-[rgba(255,255,255,0.1)] bg-[rgba(30,41,59,0.5)] text-slate-300 hover:border-[rgba(255,255,255,0.2)]'
                                        }`}
                                    >
                                        Mahasiswa
                                    </span>
                                </label>
                                <label className="flex flex-1 cursor-pointer items-center justify-center">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="lecturer"
                                        checked={data.role === 'lecturer'}
                                        onChange={(e) => setData('role', e.target.value as 'lecturer')}
                                        className="sr-only"
                                    />
                                    <span
                                        className={`w-full rounded-lg border-2 px-3 py-2 text-center text-sm font-medium transition-all duration-300 ${
                                            data.role === 'lecturer'
                                                ? 'border-brand-primary bg-brand-primary/5 text-brand-primary'
                                                : lightMode
                                                    ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                    : 'border-[rgba(255,255,255,0.1)] bg-[rgba(30,41,59,0.5)] text-slate-300 hover:border-[rgba(255,255,255,0.2)]'
                                        }`}
                                    >
                                        Dosen
                                    </span>
                                </label>
                            </div>
                            <InputError message={errors.role} />
                        </div>

                        <div>
                            <label 
                                htmlFor="password" 
                                className="block text-sm font-medium text-[var(--dm-text)]"
                            >
                                Kata Sandi
                            </label>
                            <PasswordInput
                                id="password"
                                name="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                lightMode={lightMode}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <PasswordStrengthMeter password={data.password} lightMode={lightMode} />
                            <InputError message={errors.password} />
                        </div>

                        <div>
                            <label 
                                htmlFor="password_confirmation" 
                                className="block text-sm font-medium text-[var(--dm-text)]"
                            >
                                Konfirmasi Kata Sandi
                            </label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                lightMode={lightMode}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>

                        <div>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <div className="pt-0.5">
                                    <CustomCheckbox
                                        id="terms"
                                        name="terms"
                                        checked={data.terms}
                                        onChange={(e) => setData('terms', e.target.checked)}
                                        lightMode={lightMode}
                                    />
                                </div>
                                <span
                                    className="text-sm leading-relaxed text-slate-500 text-[var(--dm-text-secondary)]"
                                >
                                    Saya menyetujui{' '}
                                    <Link href="/terms" className="font-medium text-brand-primary hover:underline">
                                        Syarat & Ketentuan
                                    </Link>
                                    {' '}Kolabri
                                </span>
                            </label>
                            <InputError message={errors.terms} />
                        </div>

                        <div className="pt-1">
                            <PrimaryButton type="submit" className="w-full justify-center" disabled={processing}>
                                {processing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Membuat Akun...
                                    </span>
                                ) : (
                                    'Buat Akun'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>

                    <p className="mt-5 text-center text-sm text-slate-500 text-[var(--dm-text-secondary)]">
                        Sudah punya akun?{' '}
                        <Link href="/login" className="font-medium text-brand-primary hover:underline">
                            Masuk
                        </Link>
                    </p>
                </LiquidGlassCard>
            </motion.div>
        </>
    );
}

// Wrap in layout to inject Context
Register.layout = (page: ReactNode) => <GuestLayout>{page}</GuestLayout>;
