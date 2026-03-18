import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { GlassPill } from './utils/helpers';

type Props = {
    lightMode: boolean;
    darkMode: boolean;
    scrolled: boolean;
    menuOpen: boolean;
    setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    activeSection: string;
};

export default function NavBar({ lightMode, darkMode, scrolled, menuOpen, setMenuOpen, setDarkMode, activeSection }: Props) {
    return (
        <>
            {/* ========== NAVIGATION - PRESERVED EXACTLY ========== */}
            <div
                className="pointer-events-none fixed top-0 right-0 left-0 z-50 flex justify-center"
                style={{
                    padding: scrolled ? '20px 20px 0' : '24px 24px 0',
                    transition: 'padding 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <nav
                    className="pointer-events-auto relative w-full overflow-hidden"
                    style={{
                        maxWidth: scrolled ? '900px' : '1200px',
                        borderRadius: '9999px',
                        background: 'rgba(140, 140, 160, 0.18)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: scrolled
                            ? 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.10)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.08)',
                        transition: 'max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: 'translateZ(0)',
                        WebkitTransform: 'translateZ(0)',
                        willChange: 'transform',
                    }}
                >
                    {/* Specular highlight OUTSIDE blend wrapper */}
                    <div
                        style={{
                            position: 'absolute',
                            left: '3rem',
                            right: '3rem',
                            top: 0,
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                            transition: 'opacity 0.5s ease',
                        }}
                    />

                    {/* ALL text/interactive content scroll-aware text color */}
                    <div style={{ position: 'relative' }}>
                        <div
                            className="flex items-center justify-between"
                            style={{
                                padding: scrolled ? '10px 20px' : '14px 28px',
                                transition: 'padding 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        >
                            {/* Logo */}
                            <a 
                                href="#hero" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="flex items-center gap-2.5"
                                aria-label="Kembali ke beranda"
                            >
                                <img
                                    src="/LogoKolabri.webp"
                                    alt="Kolabri"
                                    style={{
                                        width: scrolled ? '30px' : '36px',
                                        height: 'auto',
                                        transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                                        flexShrink: 0,
                                    }}
                                />
                                <span
                                    className="font-bold tracking-tight"
                                    style={{
                                        fontSize: scrolled ? '15px' : '17px',
                                        color: lightMode ? '#1e293b' : '#e2e8f0',
                                        transition: 'font-size 0.5s cubic-bezier(0.4,0,0.2,1)',
                                    }}
                                >
                                    Kolabri
                                </span>
                            </a>

                            {/* Nav Links - truly centered via absolute positioning */}
                            <div className="pointer-events-none absolute inset-0 hidden items-center justify-center lg:flex">
                                <div className="pointer-events-auto flex items-center gap-0.5">
                                    {[
                                        { id: 'fitur', label: 'Fitur' },
                                        { id: 'faq', label: 'FAQ' },
                                        { id: 'tentang', label: 'Tentang' },
                                    ].map((link) => {
                                        const isActive = activeSection === link.id;
                                        return (
                                            <a
                                                key={link.id}
                                                href={`#${link.id}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                                className="relative flex flex-col items-center px-4 py-2"
                                                style={{
                                                    color: isActive ? '#88161c' : lightMode ? '#1e293b' : '#cbd5e1',
                                                    fontSize: scrolled ? '14px' : '15px',
                                                    fontWeight: isActive ? 600 : 500,
                                                    textDecoration: 'none',
                                                    transition: 'color 0.2s ease, font-size 0.45s cubic-bezier(0.4,0,0.2,1)',
                                                }}
                                            >
                                                {link.label}
                                                <span
                                                    className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                                                    style={{
                                                        background: '#88161c',
                                                        opacity: isActive ? 1 : 0,
                                                        transform: `translateX(-50%) scale(${isActive ? 1 : 0})`,
                                                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                                                    }}
                                                />
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="flex items-center gap-2">
                                <div className="hidden items-center gap-2 lg:flex">
                                    {/* Dark mode toggle */}
                                    <button
                                        onClick={() => setDarkMode((d) => !d)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
                                        style={{
                                            background: lightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            border: '1px solid rgba(255,255,255,0.25)',
                                        }}
                                        aria-label="Toggle dark mode"
                                        title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
                                    >
                                        {darkMode ? (
                                            <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                className="h-4 w-4"
                                                style={{ color: lightMode ? '#4A4A4A' : '#94a3b8' }}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                            </svg>
                                        )}
                                    </button>
                                    <GlassPill
                                        href="/login"
                                        lightMode={lightMode}
                                        style={{
                                            color: lightMode ? '#1e293b' : '#cbd5e1',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Masuk
                                    </GlassPill>
                                    <GlassPill
                                        href="/register"
                                        lightMode={lightMode}
                                        isActive={false}
                                        style={{
                                            color: 'white',
                                            fontWeight: 600,
                                            background: 'linear-gradient(135deg, rgba(164,18,25,0.85) 0%, rgba(136,22,28,0.9) 100%)',
                                            backdropFilter: 'blur(16px) saturate(180%)',
                                            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            boxShadow:
                                                'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.12), 0 2px 8px rgba(136,22,28,0.3)',
                                        }}
                                    >
                                        Daftar
                                    </GlassPill>
                                </div>
                                {/* Hamburger - mobile only */}
                                <button
                                    className="flex h-9 w-9 items-center justify-center rounded-full lg:hidden"
                                    style={{
                                        background: 'rgba(255,255,255,0.15)',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                    onClick={() => setMenuOpen((v) => !v)}
                                    aria-label="Toggle menu"
                                >
                                    {menuOpen ? (
                                        <X className="h-4 w-4" style={{ color: lightMode ? '#1e293b' : '#e2e8f0' }} />
                                    ) : (
                                        <Menu className="h-4 w-4" style={{ color: lightMode ? '#1e293b' : '#e2e8f0' }} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>

            {/* ========== MOBILE MENU DRAWER ========== */}
            {menuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="fixed top-20 right-4 left-4 z-40 lg:hidden"
                    style={{
                        background: lightMode ? 'rgba(250,250,252,0.88)' : 'rgba(12,12,18,0.92)',
                        backdropFilter: 'blur(32px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                        border: lightMode ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '20px',
                        boxShadow: lightMode
                            ? 'inset 0 1px 0 rgba(255,255,255,0.6), 0 16px 48px rgba(0,0,0,0.12)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 48px rgba(0,0,0,0.5)',
                        transform: 'translateZ(0)',
                        WebkitTransform: 'translateZ(0)',
                    }}
                >
                    <div className="flex flex-col gap-1 p-4">
                        {[
                            { id: 'fitur', label: 'Fitur' },
                            { id: 'demo', label: 'Demo' },

                            { id: 'faq', label: 'FAQ' },
                            { id: 'tentang', label: 'Tentang' },
                        ].map((link) => {
                            const isActive = activeSection === link.id;
                            return (
                                <a
                                    key={link.id}
                                    href={`#${link.id}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setMenuOpen(false);
                                        document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                                    style={{
                                        color: isActive ? '#88161c' : lightMode ? '#1e293b' : '#e2e8f0',
                                        background: isActive 
                                            ? (lightMode ? 'rgba(136,22,28,0.1)' : 'rgba(136,22,28,0.2)') 
                                            : 'transparent',
                                        fontWeight: isActive ? 600 : 500,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) e.currentTarget.style.background = lightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {link.label}
                                </a>
                            );
                        })}
                        <div className="my-2 h-px" style={{ background: lightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }} />
                        <a
                            href="/login"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                            style={{ color: lightMode ? '#1e293b' : '#e2e8f0' }}
                        >
                            Masuk
                        </a>
                        <a
                            href="/register"
                            onClick={() => setMenuOpen(false)}
                            className="mt-1 flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white"
                            style={{
                                background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                backdropFilter: 'blur(16px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                                border: '1px solid rgba(255,255,255,0.18)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15), 0 4px 16px rgba(136,22,28,0.3)',
                            }}
                        >
                            Daftar Sekarang
                        </a>
                        <button
                            onClick={() => setDarkMode((d) => !d)}
                            className="mt-1 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                            style={{ color: lightMode ? '#1e293b' : '#e2e8f0' }}
                        >
                            {darkMode ? (
                                <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                            {darkMode ? 'Mode Terang' : 'Mode Gelap'}
                        </button>
                    </div>
                </motion.div>
            )}
        </>
    );
}
