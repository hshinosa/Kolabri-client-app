import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { InputError } from '@/components/ui/input-error';
import GuestLayout, { useTheme } from '@/layouts/guest-layout';
import { LiquidGlassCard, PrimaryButton } from '@/components/Welcome/utils/helpers';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';
import { refreshCsrfToken } from '@/lib/csrfRefresh';

// M2 — operator decision: these auth features are not available yet.
// Routes/controllers stay in place, they are just not promoted in the UI.
const FEATURE_RESET_PASSWORD = false;
const FEATURE_GOOGLE_LOGIN = false;

export default function Login() {
    const { lightMode } = useTheme();
    const { flash } = usePage<{ flash?: { success?: string; showResendVerification?: boolean; verificationEmail?: string } }>().props;
    const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
    const [networkError, setNetworkError] = useState<string | null>(null);
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    useEffect(() => {
        void refreshCsrfToken();
    }, []);

    // Rate limit cooldown timer
    useEffect(() => {
        if (rateLimitCooldown <= 0) return;
        const timer = setInterval(() => {
            setRateLimitCooldown(prev => {
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [rateLimitCooldown]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setNetworkError(null);
        const refreshed = await refreshCsrfToken();
        if (!refreshed) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const retried = await refreshCsrfToken();
            if (!retried) {
                setNetworkError('Koneksi bermasalah. Silakan refresh halaman.');
                return;
            }
        }
        post('/login', {
            preserveScroll: true,
            onError: (errs) => {
                // Check for rate limiting (429)
                if (errs && typeof errs === 'object') {
                    const firstError = Object.values(errs)[0];
                    if (typeof firstError === 'string' && firstError.includes('429')) {
                        setRateLimitCooldown(60);
                        return;
                    }
                    if (typeof firstError === 'string' && firstError.toLowerCase().includes('csrf')) {
                        void refreshCsrfToken();
                        setNetworkError('Sesi Anda telah berakhir. Silakan coba lagi.');
                        return;
                    }
                }
            },
            onFinish: () => {
                // Reset cooldown after request finishes if no rate limit error
                if (rateLimitCooldown > 0 && !errors.email?.includes('429')) {
                    setRateLimitCooldown(0);
                }
            },
        });
    };

    return (
        <>
            <Head title="Masuk" />

            <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
                <LiquidGlassCard intensity="medium" lightMode={lightMode} className="w-full p-8 sm:p-10 transition-colors duration-500">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--dm-text)]">
                            Selamat Datang Kembali
                        </h1>
                        <p className="mt-1.5 text-sm text-[var(--dm-text-secondary)]">
                            Masuk untuk melanjutkan perjalanan belajar Anda
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {networkError && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-lg border px-4 py-3 text-sm"
                                style={{
                                    backgroundColor: lightMode ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.15)',
                                    borderColor: lightMode ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.3)',
                                    color: lightMode ? '#dc2626' : '#fca5a5',
                                }}
                            >
                                {networkError}
                            </motion.div>
                        )}

                        {rateLimitCooldown > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-lg border px-4 py-3 text-sm"
                                style={{
                                    backgroundColor: lightMode ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.15)',
                                    borderColor: lightMode ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.3)',
                                    color: lightMode ? '#d97706' : '#fbbf24',
                                }}
                            >
                                Terlalu banyak percobaan. Tunggu {rateLimitCooldown} detik sebelum mencoba lagi.
                            </motion.div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--dm-text)]">
                                Alamat Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="mt-2 w-full rounded-xl border px-4 py-3 shadow-brand-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                                style={{
                                    backgroundColor: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.6)',
                                    borderColor: lightMode ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                                    color: lightMode ? '#1e293b' : '#f8fafc',
                                }}
                                placeholder="anda@contoh.com"
                                autoComplete="email"
                                autoFocus
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--dm-text)]">
                                Kata Sandi
                            </label>
                            <PasswordInput
                                id="password"
                                name="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                lightMode={lightMode}
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer">
                                <CustomCheckbox
                                    id="remember"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    lightMode={lightMode}
                                />
                                <span className="ml-2 text-sm text-slate-500 text-[var(--dm-text-secondary)]">
                                    Ingat saya
                                </span>
                            </label>

                            {FEATURE_RESET_PASSWORD && (
                                <Link href="/forgot-password" className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark dark:text-slate-50 dark:hover:text-slate-200">
                                    Lupa kata sandi?
                                </Link>
                            )}
                        </div>

                        <div className="pt-2">
                            <PrimaryButton
                                type="submit"
                                className="w-full justify-center"
                                disabled={processing || rateLimitCooldown > 0}
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Masuk...
                                    </span>
                                ) : (
                                    'Masuk'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>

                    {flash?.showResendVerification && flash?.verificationEmail && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 rounded-lg border p-4 text-sm"
                            style={{
                                backgroundColor: lightMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.15)',
                                borderColor: lightMode ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.3)',
                                color: lightMode ? '#2563eb' : '#93c5fd',
                            }}
                        >
                            <p className="mb-2">Email belum diverifikasi.</p>
                            <Link
                                href="/email/verify/resend"
                                method="post"
                                data={{ email: flash.verificationEmail }}
                                as="button"
                                className="font-semibold underline hover:no-underline"
                            >
                                Kirim ulang email verifikasi
                            </Link>
                        </motion.div>
                    )}

                    {FEATURE_GOOGLE_LOGIN && (
                        <>
                            <div className="my-5 flex items-center gap-3">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                                <span className="text-xs text-gray-600 dark:text-slate-500">atau</span>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                            </div>

                            <a
                                href="/auth/google"
                                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-dark shadow-brand-sm transition-all hover:shadow-brand dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-50"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Masuk dengan Google
                            </a>
                        </>
                    )}

                    <p className="mt-6 text-center text-sm text-slate-500 text-[var(--dm-text-secondary)]">
                        Belum punya akun?{' '}
                        <Link href="/register" className="font-medium text-brand-primary hover:underline">
                            Daftar Sekarang
                        </Link>
                    </p>
                </LiquidGlassCard>
            </motion.div>
        </>
    );
}

// We need to wrap it in a parent so useTheme works (GuestLayout must be the parent of the provider)
Login.layout = (page: ReactNode) => <GuestLayout>{page}</GuestLayout>;
