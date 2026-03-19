import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, ReactNode } from 'react';

import { InputError } from '@/components/ui/input-error';
import GuestLayout, { useTheme } from '@/layouts/guest-layout';
import { LiquidGlassCard, PrimaryButton } from '@/components/Welcome/utils/helpers';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';

export default function Register() {
    const { lightMode } = useTheme();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'student' as 'student' | 'lecturer',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/register');
    };

    const inputStyles = {
        backgroundColor: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.6)',
        borderColor: lightMode ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
        color: lightMode ? '#1e293b' : '#f8fafc',
    };

    return (
        <>
            <Head title="Buat Akun" />

            <div className="w-full">
                <LiquidGlassCard intensity="medium" lightMode={lightMode} className="w-full p-8 transition-colors duration-500 max-w-xl mx-auto">
                    <div className="mb-8 text-center">
                        <h1
                            className="text-2xl font-bold transition-colors duration-500"
                            style={{ color: lightMode ? '#4A4A4A' : '#f8fafc' }}
                        >
                            Buat Akun
                        </h1>
                        <p
                            className="mt-2 text-sm transition-colors duration-500"
                            style={{ color: lightMode ? '#6B7280' : '#94a3b8' }}
                        >
                            Bergabunglah dengan Kolabri untuk memulai pembelajaran kolaboratif
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label 
                                htmlFor="name" 
                                className="block text-sm font-medium transition-colors duration-500"
                                style={{ color: lightMode ? '#4A4A4A' : '#e2e8f0' }}
                            >
                                Nama Lengkap
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-2 w-full rounded-xl border px-4 py-3 shadow-sm transition-colors focus:border-[#88161c] focus:ring focus:ring-[#88161c] focus:ring-opacity-50"
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
                                style={inputStyles}
                                placeholder="anda@contoh.com"
                                autoComplete="email"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div>
                            <label 
                                htmlFor="role" 
                                className="block text-sm font-medium transition-colors duration-500"
                                style={{ color: lightMode ? '#4A4A4A' : '#e2e8f0' }}
                            >
                                Saya adalah...
                            </label>
                            <div className="mt-2 flex gap-3">
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
                                        className={`w-full rounded-xl border-2 px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
                                            data.role === 'student'
                                                ? 'border-[#88161c] bg-[rgba(136,22,28,0.05)] text-[#88161c]'
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
                                        className={`w-full rounded-xl border-2 px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
                                            data.role === 'lecturer'
                                                ? 'border-[#88161c] bg-[rgba(136,22,28,0.05)] text-[#88161c]'
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
                                autoComplete="new-password"
                            />
                            <PasswordStrengthMeter password={data.password} lightMode={lightMode} />
                            <InputError message={errors.password} />
                        </div>

                        <div>
                            <label 
                                htmlFor="password_confirmation" 
                                className="block text-sm font-medium transition-colors duration-500"
                                style={{ color: lightMode ? '#4A4A4A' : '#e2e8f0' }}
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

                        <div className="pt-2">
                            <PrimaryButton className="w-full justify-center" disabled={processing}>
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

                    <p
                        className="mt-6 text-center text-sm transition-colors"
                        style={{ color: lightMode ? '#64748b' : '#94a3b8' }}
                    >
                        Sudah punya akun?{' '}
                        <Link href="/login" className="font-medium text-[#88161c] hover:underline">
                            Masuk
                        </Link>
                    </p>
                </LiquidGlassCard>
            </div>
        </>
    );
}

// Wrap in layout to inject Context
Register.layout = (page: ReactNode) => <GuestLayout>{page}</GuestLayout>;
