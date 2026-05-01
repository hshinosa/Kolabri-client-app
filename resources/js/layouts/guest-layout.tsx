import { motion, AnimatePresence } from 'framer-motion';
import { PropsWithChildren, useEffect, useState, createContext, useContext } from 'react';
import { Moon, Sun, MessageSquare, BarChart3, Users } from 'lucide-react';
import { OrganicBlob } from '../components/Welcome/utils/helpers';

import { ToastNotification } from '@/components/ui/ToastNotification';
export const ThemeContext = createContext({ lightMode: true });
export const useTheme = () => useContext(ThemeContext);

export default function GuestLayout({ children }: PropsWithChildren) {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const isDark =
            localStorage.getItem('kolabri_theme') === 'dark' ||
            localStorage.getItem('kolabri-dark') === 'true';
        setDarkMode(isDark);
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.body.style.backgroundColor = '#0a0a0f';
            localStorage.setItem('kolabri_theme', 'dark');
            localStorage.setItem('kolabri-dark', 'true');
        } else {
            document.body.style.backgroundColor = '#E8EDF8';
            localStorage.setItem('kolabri_theme', 'light');
            localStorage.setItem('kolabri-dark', 'false');
        }
    }, [darkMode]);

    const lightMode = !darkMode;
    const t = (light: string, dark: string) => (lightMode ? light : dark);

    return (
        <ThemeContext.Provider value={{ lightMode }}>
            <div
                className="relative flex min-h-screen overflow-hidden transition-colors duration-500"
                style={{
                    background: t(
                        'linear-gradient(135deg, #E8EDF8 0%, #EDF0F7 50%, #E8EDF8 100%)',
                        '#0a0a0f',
                    ),
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                {/* Theme toggle */}
                <div className="absolute right-6 top-6 z-50">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="relative flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300"
                        style={{
                            background: t('rgba(255,255,255,0.7)', 'rgba(30,41,59,0.5)'),
                            border: `1px solid ${t('rgba(255,255,255,0.5)', 'rgba(255,255,255,0.1)')}`,
                            boxShadow: t(
                                '0 4px 6px -1px rgba(0,0,0,0.05)',
                                '0 4px 6px -1px rgba(0,0,0,0.2)',
                            ),
                            color: t('#475569', '#e2e8f0'),
                        }}
                        aria-label="Toggle Dark Mode"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={darkMode ? 'dark' : 'light'}
                                initial={{ y: -20, opacity: 0, rotate: -90 }}
                                animate={{ y: 0, opacity: 1, rotate: 0 }}
                                exit={{ y: 20, opacity: 0, rotate: 90 }}
                                transition={{ duration: 0.2 }}
                            >
                                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                            </motion.div>
                        </AnimatePresence>
                    </button>
                </div>

                {/* Background blobs */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <OrganicBlob delay={0} color={t('rgba(136,22,28,0.04)', 'rgba(164,18,25,0.06)')} size={500} className="-left-48 -top-48" />
                    <OrganicBlob delay={2} color={t('rgba(136,22,28,0.03)', 'rgba(164,18,25,0.04)')} size={400} className="-bottom-32 -right-32" />
                </div>

                <ToastNotification lightMode={lightMode} />

                {/* ── Desktop: split-screen ── */}
                <div className="relative z-10 flex w-full flex-col lg:flex-row lg:min-h-screen">

                    {/* Left panel — branding (55%) */}
                    <div className="hidden lg:flex lg:w-[55%] lg:flex-col lg:items-center lg:justify-center lg:px-12 xl:px-20">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                            className="flex max-w-lg flex-col items-center text-center"
                        >
                            {/* Logo */}
                            <div
                                className="mb-8 flex h-36 w-36 items-center justify-center rounded-3xl shadow-2xl transition-colors duration-500"
                                style={{
                                    background: t('white', 'rgba(30,41,59,0.8)'),
                                    border: `1px solid ${t('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.08)')}`,
                                }}
                            >
                                <img src="/LogoKolabri.webp" alt="Kolabri Logo" className="h-24 w-24 object-contain" />
                            </div>

                            {/* Title */}
                            <h1
                                className="text-5xl font-bold tracking-tight transition-colors duration-500"
                                style={{ color: t('#4A4A4A', '#f8fafc') }}
                            >
                                Kolabri
                            </h1>

                            {/* Divider + subtitle */}
                            <div className="mt-4 flex items-center justify-center gap-4">
                                <span className="h-px w-16 bg-[#88161c] opacity-25" />
                                <p className="text-sm font-semibold tracking-[0.2em] text-[#88161c] uppercase">
                                    Platform Kolaborasi
                                </p>
                                <span className="h-px w-16 bg-[#88161c] opacity-25" />
                            </div>

                            {/* Description */}
                            <p
                                className="mt-6 max-w-sm text-sm leading-relaxed transition-colors duration-500"
                                style={{ color: t('#6B7280', '#94a3b8') }}
                            >
                                AI-Powered Collaborative Learning Environment.
                                Tingkatkan kualitas diskusi, analisis proses pembelajaran secara real-time,
                                dan capai pemahaman yang lebih mendalam.
                            </p>

                            {/* Feature pills */}
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                                {[
                                    { icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Diskusi Bermakna' },
                                    { icon: <BarChart3 className="h-3.5 w-3.5" />, label: 'Analitik Real-time' },
                                    { icon: <Users className="h-3.5 w-3.5" />, label: 'Kolaborasi Tim' },
                                ].map((f) => (
                                    <span
                                        key={f.label}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-500"
                                        style={{
                                            background: t('rgba(136,22,28,0.06)', 'rgba(136,22,28,0.12)'),
                                            color: t('#88161c', '#f8a5a5'),
                                            border: `1px solid ${t('rgba(136,22,28,0.1)', 'rgba(136,22,28,0.2)')}`,
                                        }}
                                    >
                                        {f.icon}
                                        {f.label}
                                    </span>
                                ))}
                            </div>

                            {/* Quote */}
                            <motion.blockquote
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4, duration: 0.6 }}
                                className="mt-10 max-w-sm rounded-2xl px-6 py-5 transition-colors duration-500"
                                style={{
                                    background: t('rgba(255,255,255,0.5)', 'rgba(255,255,255,0.04)'),
                                    border: `1px solid ${t('rgba(0,0,0,0.04)', 'rgba(255,255,255,0.06)')}`,
                                }}
                            >
                                <p
                                    className="text-sm italic leading-relaxed"
                                    style={{ color: t('#4A4A4A', '#cbd5e1') }}
                                >
                                    "Kolabri membantu saya memahami proses belajar mahasiswa secara real-time
                                    dan memberikan intervensi tepat waktu."
                                </p>
                                <footer className="mt-3 flex items-center justify-center gap-2">
                                    <div
                                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                                        style={{ background: 'linear-gradient(135deg, #88161c, #a41219)' }}
                                    >
                                        D
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-semibold" style={{ color: t('#4A4A4A', '#e2e8f0') }}>
                                            Dosen
                                        </p>
                                        <p className="text-[10px]" style={{ color: t('#6B7280', '#64748b') }}>
                                            Telkom University
                                        </p>
                                    </div>
                                </footer>
                            </motion.blockquote>
                        </motion.div>
                    </div>

                    {/* Right panel — form (45%) */}
                    <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-[45%] lg:px-8 xl:px-12">
                        {/* Mobile logo */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="relative z-10 mb-8 lg:hidden"
                        >
                            <div className="flex flex-col items-center">
                                <div
                                    className="mb-3 flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl transition-colors duration-500"
                                    style={{ background: t('white', 'rgba(30,41,59,0.8)') }}
                                >
                                    <img src="/LogoKolabri.webp" alt="Kolabri Logo" className="h-12 w-12 object-contain" />
                                </div>
                                <h1
                                    className="text-2xl font-bold tracking-tight transition-colors duration-500"
                                    style={{ color: t('#4A4A4A', '#f8fafc') }}
                                >
                                    Kolabri
                                </h1>
                            </div>
                        </motion.div>

                        <div className="relative z-10 w-full max-w-[440px]">{children}</div>

                        <motion.footer
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="relative z-10 mt-6 text-center text-xs"
                            style={{ color: t('#6B7280', '#94a3b8') }}
                        >
                            <p className="font-medium text-[#88161c]">Dikembangkan di Telkom University</p>
                        </motion.footer>
                    </div>
                </div>
            </div>
        </ThemeContext.Provider>
    );
}
