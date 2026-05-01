import LandingPageContent from '@/components/Welcome/LandingPageContent';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function Welcome() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string>('');
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return (
                localStorage.getItem('kolabri_theme') === 'dark' ||
                localStorage.getItem('kolabri-dark') === 'true'
            );
        }
        return false;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            document.body.style.backgroundColor = '#0a0a0f';
        } else {
            document.documentElement.classList.remove('dark');
            document.body.style.backgroundColor = '#E8EDF8';
        }
        document.body.style.overflowX = 'hidden';
        localStorage.setItem('kolabri-dark', darkMode ? 'true' : 'false');
        localStorage.setItem('kolabri_theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });

        const sections = ['hero', 'statistik', 'fitur', 'cara-kerja', 'demo', 'use-cases', 'faq', 'tentang', 'cta'];
        const observers: IntersectionObserver[] = [];
        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            const obs = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveSection(id);
                },
                { threshold: 0.3 },
            );
            obs.observe(el);
            observers.push(obs);
        });

        return () => {
            window.removeEventListener('scroll', onScroll);
            observers.forEach((o) => o.disconnect());
        };
    }, []);

    const lightMode = !darkMode;

    return (
        <>
            <Head title="Kolabri - Platform Pembelajaran Kolaboratif">
                <meta name="description" content="Kolabri adalah platform pembelajaran kolaboratif berbasis AI untuk pendidikan tinggi. Diskusi bermakna, analitik real-time, dan intervensi tepat waktu untuk dosen dan mahasiswa." />
                <meta name="keywords" content="kolabri, pembelajaran kolaboratif, analitik pembelajaran, self-regulated learning, SRL, Telkom University, platform pendidikan" />
                <meta property="og:title" content="Kolabri - Platform Pembelajaran Kolaboratif" />
                <meta property="og:description" content="Diskusi yang bermakna, pembelajaran yang terukur. Platform kolaboratif berbasis AI untuk pendidikan tinggi." />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Kolabri - Platform Pembelajaran Kolaboratif" />
                <meta name="twitter:description" content="Diskusi yang bermakna, pembelajaran yang terukur. Platform kolaboratif berbasis AI untuk pendidikan tinggi." />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
                    rel="stylesheet"
                />
            </Head>
            <LandingPageContent
                lightMode={lightMode}
                darkMode={darkMode}
                scrolled={scrolled}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                setDarkMode={setDarkMode}
                activeSection={activeSection}
            />
        </>
    );
}
