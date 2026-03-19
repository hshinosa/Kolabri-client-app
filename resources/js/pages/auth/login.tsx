import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, ReactNode } from 'react';

import { InputError } from '@/components/ui/input-error';
import GuestLayout, { useTheme } from '@/layouts/guest-layout';
import { LiquidGlassCard, PrimaryButton } from '@/components/Welcome/utils/helpers';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';

export default function Login() {
    const { lightMode } = useTheme();
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <>
            <Head title="Masuk" />

            <div className="w-full">
                <LiquidGlassCard intensity="medium" lightMode={lightMode} className="w-full p-8 transition-colors duration-500">
                    <div className="mb-8 text-center">
                        <h1
                            className="text-2xl font-bold transition-colors duration-500"
                            style={{ color: lightMode ? '#4A4A4A' : '#f8fafc' }}
                        >
                            Selamat Datang Kembali
                        </h1>
                        <p
                            className="mt-2 text-sm transition-colors duration-500"
                            style={{ color: lightMode ? '#6B7280' : '#94a3b8' }}
                        >
                            Masuk untuk melanjutkan perjalanan belajar Anda
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label 
                                htmlFor="email" 
                                className="block text-sm font-medium transition-colors duration-500"
                                style={{ color: lightMode ? '#4A4A4A' : '#e2e8f0' }}
                            >
                                Alamat Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="mt-2 w-full rounded-xl border px-4 py-3 shadow-sm transition-colors focus:border-[#88161c] focus:ring focus:ring-[#88161c] focus:ring-opacity-50"
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
                            <label 
                                htmlFor="password" 
                                className="block text-sm font-medium transition-colors duration-500"
                                style={{ color: lightMode ? '#4A4A4A' : '#e2e8f0' }}
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
                                <span
                                    className="ml-2 text-sm transition-colors"
                                    style={{ color: lightMode ? '#64748b' : '#94a3b8' }}
                                >
                                    Ingat saya
                                </span>
                            </label>

                            <Link
                                href="/forgot-password"
                                className="text-sm font-semibold transition-colors hover:text-[#88161c]"
                                style={{ color: lightMode ? '#88161c' : '#f8fafc' }}
                            >
                                Lupa kata sandi?
                            </Link>
                        </div>

                        <div className="pt-2">
                            <PrimaryButton className="w-full justify-center" disabled={processing}>
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

                    <p
                        className="mt-6 text-center text-sm transition-colors"
                        style={{ color: lightMode ? '#64748b' : '#94a3b8' }}
                    >
                        Belum punya akun?{' '}
                        <Link href="/register" className="font-medium text-[#88161c] hover:underline">
                            Daftar Sekarang
                        </Link>
                    </p>
                </LiquidGlassCard>
            </div>
        </>
    );
}

// We need to wrap it in a parent so useTheme works (GuestLayout must be the parent of the provider)
Login.layout = (page: ReactNode) => <GuestLayout>{page}</GuestLayout>;
