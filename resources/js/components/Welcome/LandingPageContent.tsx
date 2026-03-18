import AboutSection from './AboutSection';
import CtaSection from './CtaSection';
import DemoSection from './DemoSection';
import FeaturesSection from './FeaturesSection';
import FaqSection from './FaqSection';
import FooterSection from './FooterSection';
import HeroSection from './HeroSection';
import HowItWorksSection from './HowItWorksSection';
import NavBar from './NavBar';
import ProgressTimeline from './ProgressTimeline';
import StatsSection from './StatsSection';

import UseCasesSection from './UseCasesSection';

type Props = {
    lightMode: boolean;
    darkMode: boolean;
    scrolled: boolean;
    menuOpen: boolean;
    setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    activeSection: string;
};

export default function LandingPageContent({ lightMode, darkMode, scrolled, menuOpen, setMenuOpen, setDarkMode, activeSection }: Props) {
    return (
        <div
            className="min-h-screen antialiased"
            style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: lightMode ? 'linear-gradient(135deg, #EDE8F4 0%, #E8EDF8 35%, #EDF0F7 65%, #F0EBF5 100%)' : '#0a0a0f',
                color: lightMode ? '#4A4A4A' : '#e5e7eb',
                scrollBehavior: 'smooth',
                transition: 'background 0.3s ease, color 0.3s ease',
            }}
        >
            <NavBar
                lightMode={lightMode}
                darkMode={darkMode}
                scrolled={scrolled}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                setDarkMode={setDarkMode}
                activeSection={activeSection}
            />
            <ProgressTimeline lightMode={lightMode} activeSection={activeSection} />
            <HeroSection lightMode={lightMode} />
            <StatsSection lightMode={lightMode} />
            <FeaturesSection lightMode={lightMode} />
            <HowItWorksSection lightMode={lightMode} />
            <DemoSection lightMode={lightMode} />
            <UseCasesSection lightMode={lightMode} />
            <AboutSection lightMode={lightMode} />

            <FaqSection lightMode={lightMode} />
            <CtaSection lightMode={lightMode} />
            <FooterSection lightMode={lightMode} />
        </div>
    );
}
