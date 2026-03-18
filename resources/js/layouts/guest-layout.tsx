import { motion, AnimatePresence } from 'framer-motion';
import { PropsWithChildren, useEffect, useState, createContext, useContext } from 'react';
import { Moon, Sun } from 'lucide-react';
import { OrganicBlob } from '../components/Welcome/utils/helpers';

import { ToastNotification } from '@/components/ui/ToastNotification';
export const ThemeContext = createContext({ lightMode: true });
export const useTheme = () => useContext(ThemeContext);

export default function GuestLayout({ children }: PropsWithChildren) {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        // Initialization
        const isDark = localStorage.getItem('kolabri_theme') === 'dark';
        setDarkMode(isDark);
    }, []);

    useEffect(() => {
        // Side effect: body background color
        if (darkMode) {
            document.body.style.backgroundColor = '#0a0a0f';
            localStorage.setItem('kolabri_theme', 'dark');
        } else {
            document.body.style.backgroundColor = '#EDE8F4';
            localStorage.setItem('kolabri_theme', 'light');
        }
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, [darkMode]);

    const lightMode = !darkMode;

    return (
        <ThemeContext.Provider value={{ lightMode }}>
            <div
                className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 transition-colors duration-500"
                style={{
                    background: lightMode
                        ? 'linear-gradient(135deg, #EDE8F4 0%, #E8EDF8 35%, #EDF0F7 70%, #F0EBF5 100%)'
                        : '#0a0a0f',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                {/* Theme Toggle Button */}
                <div className="absolute right-6 top-6 z-50">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="relative flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300"
                        style={{
                            background: lightMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 41, 59, 0.5)',
                            border: `1px solid ${lightMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                            boxShadow: lightMode
                                ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                                : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                            color: lightMode ? '#475569' : '#e2e8f0',
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

                {/* Background Decor */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {lightMode ? (
                        <>
                            <OrganicBlob delay={0} color="rgba(136,22,28,0.06)" size={600} className="-left-48 -top-48" />
                            <OrganicBlob delay={2} color="rgba(136,22,28,0.04)" size={500} className="-bottom-32 -right-32" />
                        </>
                    ) : (
                        <>
                            <OrganicBlob delay={0} color="rgba(164,18,25,0.08)" size={600} className="-left-48 -top-48" />
                            <OrganicBlob delay={2} color="rgba(164,18,25,0.06)" size={500} className="-bottom-32 -right-32" />
                        </>
                    )}
                </div>

                {/* Global Toast Notifications */}
                <ToastNotification lightMode={lightMode} />

                <div className="relative z-10 w-full lg:flex lg:h-screen lg:max-w-none lg:items-center lg:justify-between lg:gap-12 lg:px-12">
                    {/* Left Side: Branding / Illustration (Hidden on Mobile) */}
                    <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:items-center lg:justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="relative z-10 flex flex-col items-center text-center"
                        >
                            <div
                                className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-3xl shadow-xl transition-colors duration-500"
                                style={{ background: lightMode ? 'white' : 'rgba(30, 41, 59, 0.8)' }}
                            >
                                <img src="/LogoKolabri.webp" alt="Kolabri Logo" className="h-20 w-20 object-contain" />
                            </div>
                            <h1
                                className="text-4xl font-bold tracking-tight transition-colors duration-500 md:text-5xl"
                                style={{ color: lightMode ? '#4A4A4A' : '#f8fafc' }}
                            >
                                Kolabri
                            </h1>
                            <div className="mt-4 flex items-center justify-center gap-4">
                                <span className="h-px w-12 bg-[#88161c] opacity-20" />
                                <p className="text-base font-medium tracking-widest text-[#88161c] uppercase">
                                    Platform Kolaborasi
                                </p>
                                <span className="h-px w-12 bg-[#88161c] opacity-20" />
                            </div>
                            <p
                                className="mt-6 max-w-md text-sm leading-relaxed transition-colors duration-500"
                                style={{ color: lightMode ? '#6B7280' : '#94a3b8' }}
                            >
                                AI-Powered Collaborative Learning Environment. Tingkatkan kualitas diskusi, analisis proses pembelajaran secara real-time, dan capai pemahaman yang lebih mendalam.
                            </p>
                        </motion.div>
                    </div>

                    {/* Right Side: Auth Form */}
                    <div className="flex w-full flex-col items-center justify-center lg:w-[480px] lg:flex-shrink-0">
                        {/* Mobile Logo (Visible only on mobile) */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="relative z-10 mb-10 lg:hidden"
                        >
                            <div className="flex flex-col items-center">
                                <div
                                    className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl transition-colors duration-500"
                                    style={{ background: lightMode ? 'white' : 'rgba(30, 41, 59, 0.8)' }}
                                >
                                    <img src="/LogoKolabri.webp" alt="Kolabri Logo" className="h-12 w-12 object-contain" />
                                </div>
                                <h1
                                    className="text-3xl font-bold tracking-tight transition-colors duration-500"
                                    style={{ color: lightMode ? '#4A4A4A' : '#f8fafc' }}
                                >
                                    Kolabri
                                </h1>
                            </div>
                        </motion.div>

                        <div className="relative z-10 w-full max-w-md">{children}</div>

                        {/* Academic Footer */}
                        <motion.footer
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="relative z-10 mt-8 text-center text-xs transition-colors duration-500"
                            style={{ color: lightMode ? '#6B7280' : '#94a3b8' }}
                        >
                            <p className="font-medium text-[#88161c]">Dikembangkan di Telkom University</p>
                        </motion.footer>
                    </div>
                </div>
            </div>
        </ThemeContext.Provider>
    );
}
