import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, GraduationCap, Users } from 'lucide-react';
import { HeroDashboard, OrganicBlob, PrimaryButton, SecondaryButton, useReducedMotion } from './utils/helpers';

type Props = { lightMode: boolean };

export default function HeroSection({ lightMode }: Props) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <>
            {/* ========== HERO SECTION ========== */}
            <section id="hero" className="relative min-h-screen overflow-hidden pt-32 pb-20">
                {/* Ultra-thin grid background */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage: lightMode
                            ? `linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)`
                            : `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                        backgroundSize: '36px 36px',
                        maskImage: 'radial-gradient(ellipse at center, black 42%, transparent 85%)',
                        WebkitMaskImage: 'radial-gradient(ellipse at center, black 42%, transparent 85%)',
                    }}
                />

                {/* Organic blobs - calmer layered depth */}
                <OrganicBlob className="top-0 left-0" delay={0} color="rgba(136, 22, 28, 0.045)" size={560} />
                <OrganicBlob className="top-1/3 right-0" delay={-6} color="rgba(136, 22, 28, 0.03)" size={420} />
                <OrganicBlob className="bottom-0 left-1/4" delay={-9} color="rgba(74, 74, 74, 0.03)" size={340} />

                {/* Central refractive orb */}
                <motion.div
                    className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    animate={
                        prefersReducedMotion
                            ? { scale: 1, rotate: 0 }
                            : {
                                  scale: [1, 1.025, 1],
                                  rotate: [0, 0.8, -0.8, 0],
                              }
                    }
                    transition={
                        prefersReducedMotion
                            ? { duration: 0.3 }
                            : {
                                  duration: 22,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                              }
                    }
                >
                    <div
                        className="rounded-full"
                        style={{
                            width: 720,
                            height: 720,
                            background: `
                            radial-gradient(ellipse at 30% 30%, rgba(136,22,28,0.045) 0%, transparent 52%),
                            radial-gradient(ellipse at 70% 70%, rgba(136,22,28,0.03) 0%, transparent 52%),
                            radial-gradient(ellipse at 50% 50%, rgba(74,74,74,0.025) 0%, transparent 50%)
                        `,
                            filter: 'blur(72px)',
                        }}
                    />
                </motion.div>

                <div className="relative mx-auto max-w-7xl px-6 pt-8">
                    <div className="flex flex-col items-center">
                        {/* Hero Text - Asymmetric Layout */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                            className="relative mx-auto max-w-4xl"
                        >
                            {/* Main headline - Editorial typography */}
                            <h1
                                className={`text-center text-5xl leading-[1.15] font-light tracking-tight md:text-6xl lg:text-7xl xl:text-8xl`}
                                style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                <motion.span
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.7 }}
                                    className="block"
                                    style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb' }}
                                >
                                    Diskusi yang <span className="italic">bermakna,</span>
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.7 }}
                                    className={`block bg-gradient-to-r from-[#88161c] via-[#a41219] to-[#88161c] bg-clip-text pb-2 text-transparent`}
                                >
                                    pembelajaran yang
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.7 }}
                                    className="block"
                                    style={{ color: lightMode ? '#88161c' : '#88161c' }}
                                >
                                    terukur.
                                </motion.span>
                            </h1>

                            {/* Subheadline */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8, duration: 0.8 }}
                                className="mx-auto mt-8 max-w-xl text-center text-base leading-relaxed text-[#6B7280] md:text-lg"
                            >
                                Bantu mahasiswa berdiskusi lebih baik. Bantu dosen memahami lebih dalam. Semua dalam satu platform yang sederhana.
                            </motion.p>

                            {/* CTA Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1, duration: 0.6 }}
                                className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
                            >
                                <PrimaryButton href="/register">
                                    Mulai Sekarang
                                    <ChevronRight className="h-4 w-4" />
                                </PrimaryButton>

                                <SecondaryButton href="#fitur" lightMode={lightMode}>
                                    Pelajari Fitur
                                </SecondaryButton>
                            </motion.div>

                            {/* Trust indicators */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.2, duration: 0.6 }}
                                className="mt-12 flex justify-center"
                            >
                                <div
                                    className="flex w-fit flex-wrap items-center justify-center gap-4 rounded-2xl px-6 py-4"
                                    style={{
                                        background: lightMode
                                            ? 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.12) 100%)'
                                            : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                                        backdropFilter: 'blur(16px) saturate(180%)',
                                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                                        border: lightMode ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: lightMode
                                            ? 'inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 16px rgba(0,0,0,0.06)'
                                            : 'inset 0 1px 0 rgba(255,255,255,0.08)',
                                    }}
                                >
                                    {[
                                        { icon: <GraduationCap className="h-4 w-4" />, text: 'Telkom University' },
                                        { icon: <BookOpen className="h-4 w-4" />, text: 'Proyek Akademik' },
                                        { icon: <Users className="h-4 w-4" />, text: 'Untuk Dosen & Mahasiswa' },
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex items-center gap-2"
                                            initial={{ opacity: 0, y: 3 }}
                                            animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -1.5, 0] }}
                                            transition={{
                                                delay: 1.25 + i * 0.08,
                                                opacity: { duration: 0.35 },
                                                y: prefersReducedMotion
                                                    ? { duration: 0.3 }
                                                    : { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 },
                                            }}
                                        >
                                            <div className="text-[#88161c]">{item.icon}</div>
                                            <span className="text-sm font-medium" style={{ color: lightMode ? '#4A4A4A' : '#cbd5e1' }}>
                                                {item.text}
                                            </span>
                                            {i < 2 && (
                                                <div
                                                    className="ml-2 h-4 w-px"
                                                    style={{ background: lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}
                                                />
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Dashboard Preview */}
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -4, 0] }}
                            transition={{
                                opacity: { delay: 0.6, duration: 1, ease: [0.25, 0.1, 0.25, 1] },
                                y: prefersReducedMotion
                                    ? { duration: 0.3 }
                                    : { delay: 1.6, duration: 8, repeat: Infinity, ease: 'easeInOut' },
                            }}
                            className="mt-20 w-full max-w-7xl"
                        >
                            <HeroDashboard lightMode={lightMode} />
                        </motion.div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 0.6 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2"
                    aria-hidden="true"
                >
                    <motion.div
                        animate={prefersReducedMotion ? { y: 0 } : { y: [0, 8, 0] }}
                        transition={prefersReducedMotion ? { duration: 0.3 } : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="flex flex-col items-center gap-2"
                    >
                        <span className="text-xs tracking-widest text-[#6B7280]/60 uppercase">Gulir</span>
                        <div className="h-12 w-px bg-gradient-to-b from-[#4A4A4A]/30 to-transparent" />
                    </motion.div>
                </motion.div>
            </section>
        </>
    );
}
