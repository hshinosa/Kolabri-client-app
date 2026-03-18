import { motion } from 'framer-motion';

type Props = {
    lightMode: boolean;
    activeSection: string;
};

export default function ProgressTimeline({ lightMode, activeSection }: Props) {
    const sections = [
        { id: 'hero', label: 'Beranda' },
        { id: 'statistik', label: 'Statistik' },
        { id: 'fitur', label: 'Fitur' },
        { id: 'cara-kerja', label: 'Cara Kerja' },
        { id: 'demo', label: 'Demo' },
        { id: 'use-cases', label: 'Use Cases' },

        { id: 'faq', label: 'FAQ' },
        { id: 'tentang', label: 'Tentang' },
    ];

    // Jika activeSection kosong (saat baru load), set ke 'hero'
    const currentActive = activeSection || 'hero';

    return (
        <nav className="fixed top-1/2 right-8 z-40 hidden -translate-y-1/2 flex-col items-end gap-6 xl:flex" aria-label="Page sections navigation" role="navigation">
            {sections.map((section, index) => {
                const isActive = currentActive === section.id;
                
                return (
                    <div key={section.id} className="group relative flex items-center gap-4">
                        {/* Label */}
                        <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ 
                                opacity: isActive ? 1 : 0.4,
                                x: isActive ? 0 : 5,
                                fontWeight: isActive ? 600 : 400
                            }}
                            className="text-sm transition-all duration-300 group-hover:opacity-100"
                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb' }}
                        >
                            {section.label}
                        </motion.span>
                        
                        {/* Indicator Line/Dot */}
                        <div className="relative flex h-8 w-1 items-center justify-center">
                            {/* Background Line */}
                            {index !== sections.length - 1 && (
                                <div 
                                    className="absolute top-4 h-full w-px"
                                    style={{ background: lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}
                                />
                            )}
                            
                            {/* Active Dot */}
                            <motion.div
                                animate={{
                                    height: isActive ? 24 : 8,
                                    width: isActive ? 4 : 4,
                                    backgroundColor: isActive 
                                        ? '#88161c' 
                                        : lightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                                }}
                                className="z-10 rounded-full transition-all duration-300"
                            />
                        </div>
                        
                        {/* Clickable Area Overlay */}
                        <a 
                            href={`#${section.id}`} 
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="absolute inset-0 cursor-pointer"
                            aria-label={`Scroll to ${section.label}`}
                        />
                    </div>
                );
            })}
        </nav>
    );
}
