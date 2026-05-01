type Props = { lightMode: boolean };

const footerLinks = [
    { id: 'fitur', label: 'Fitur' },
    { id: 'cara-kerja', label: 'Cara Kerja' },
    { id: 'demo', label: 'Demo' },
    { id: 'use-cases', label: 'Kasus Penggunaan' },

    { id: 'faq', label: 'FAQ' },
    { id: 'tentang', label: 'Tentang' },
];

const smoothScroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

export default function FooterSection({ lightMode }: Props) {
    return (
        <>
            {/* ========== FOOTER ========== */}
            <footer
                className="relative py-16"
                style={{
                    background: lightMode ? 'rgba(255,255,255,0.3)' : 'rgba(10,10,18,0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderTop: lightMode ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <div className="mx-auto max-w-7xl px-6">
                    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                        {/* Logo + tagline */}
                        <div className="flex flex-col gap-2">
                            <a
                                href="#hero"
                                onClick={(e) => { e.preventDefault(); smoothScroll('hero'); }}
                                className="flex items-center gap-3"
                                aria-label="Kembali ke beranda"
                            >
                                <img src="/LogoKolabri.webp" alt="Kolabri" className="h-10 w-auto" loading="lazy" />
                                <span
                                    className="text-lg font-semibold"
                                    style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                    Kolabri
                                </span>
                            </a>
                            <p className="max-w-[240px] text-xs leading-relaxed text-[#6B7280]">
                                Platform pembelajaran kolaboratif berbasis data untuk pendidikan tinggi.
                            </p>
                        </div>

                        {/* Divider - mobile only */}
                        <div className="h-px w-full bg-[#4A4A4A]/10 md:hidden" />

                        {/* Links */}
                        <div className="flex flex-wrap gap-x-8 gap-y-2">
                            {footerLinks.map((link) => (
                                <a
                                    key={link.id}
                                    href={`#${link.id}`}
                                    onClick={(e) => { e.preventDefault(); smoothScroll(link.id); }}
                                    className="text-sm transition-colors"
                                    style={{ color: '#6B7280' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = lightMode ? '#1e293b' : '#e5e7eb')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <a
                                href="/login"
                                className="text-sm transition-colors"
                                style={{ color: '#6B7280' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = lightMode ? '#1e293b' : '#e5e7eb')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
                            >
                                Masuk
                            </a>
                        </div>

                        {/* Divider - mobile only */}
                        <div className="h-px w-full bg-[#4A4A4A]/10 md:hidden" />

                        {/* Copyright */}
                        <p className="text-sm text-[#6B7280]">&copy; {new Date().getFullYear()} Kolabri. Hak cipta dilindungi.</p>
                    </div>
                </div>
            </footer>
        </>
    );
}
