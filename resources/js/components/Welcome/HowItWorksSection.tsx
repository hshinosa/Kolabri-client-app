import { motion } from 'framer-motion';
import { LiquidGlassCard, StepCard, useReducedMotion } from './utils/helpers';

type Props = { lightMode: boolean };

const steps = [
    { number: 1, label: 'Buat Kelas & Grup', short: 'Setup' },
    { number: 2, label: 'Diskusi & Kolaborasi', short: 'Diskusi' },
    { number: 3, label: 'Analisis & Intervensi', short: 'Insights' },
];

export default function HowItWorksSection({ lightMode }: Props) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <>
            {/* ========== HOW IT WORKS SECTION ========== */}
            <section id="cara-kerja" className="relative py-32">
                {/* Decorative floating shapes */}
                <motion.div
                    animate={
                        prefersReducedMotion
                            ? { scale: 1, rotate: 0 }
                            : { scale: [1, 1.1, 1], rotate: [0, 90, 0] }
                    }
                    transition={
                        prefersReducedMotion
                            ? { duration: 0.3 }
                            : { duration: 15, repeat: Infinity, ease: 'linear' }
                    }
                    className="pointer-events-none absolute top-1/3 -left-20 h-96 w-96 rounded-full opacity-10 blur-3xl"
                    style={{
                        background: lightMode
                            ? 'radial-gradient(circle, rgba(136,22,28,0.15) 0%, rgba(0,0,0,0) 70%)'
                            : 'radial-gradient(circle, rgba(164,18,25,0.2) 0%, rgba(0,0,0,0) 70%)',
                    }}
                />
                <motion.div
                    animate={prefersReducedMotion ? { y: 0 } : { y: [0, -40, 0] }}
                    transition={prefersReducedMotion ? { duration: 0.3 } : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    className="pointer-events-none absolute right-10 bottom-1/4 h-48 w-48 rounded-full opacity-20 blur-2xl"
                    style={{ background: lightMode ? 'rgba(234,179,8,0.08)' : 'rgba(245,158,11,0.1)' }}
                />

                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute top-0 -right-1/4 h-full w-1/2"
                        style={{ background: 'radial-gradient(ellipse at right, rgba(136,22,28,0.04) 0%, rgba(255,255,255,0) 60%)' }}
                    />
                </div>

                <div className="relative mx-auto max-w-7xl px-6">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="mb-16 text-center"
                    >
                        <span className="mb-4 inline-block text-xl tracking-[0.2em] text-[#88161c] uppercase">Cara Kerja</span>
                        <h2
                            className="mx-auto max-w-3xl text-3xl font-light tracking-tight md:text-4xl lg:text-5xl"
                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Mulai dalam <span className="text-[#6B7280] italic">tiga langkah sederhana</span>
                        </h2>
                    </motion.div>


                    {/* Mobile-only summary card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="mb-8 block lg:hidden"
                    >
                        <div
                            className="rounded-xl px-5 py-4"
                            style={{
                                background: lightMode ? 'rgba(136,22,28,0.06)' : 'rgba(136,22,28,0.1)',
                                border: '1px solid rgba(136,22,28,0.1)',
                            }}
                        >
                            <p className="text-sm leading-relaxed text-[#6B7280]">
                                Tidak perlu setup rumit. Kolabri dirancang agar dosen dan mahasiswa bisa langsung fokus pada yang penting —
                                belajar bersama.
                            </p>
                        </div>
                    </motion.div>

                    {/* 2-column layout */}
                    <div className="grid items-start gap-12 lg:grid-cols-2">
                        {/* Left: decorative panel */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                            className="hidden lg:block"
                        >
                            <LiquidGlassCard className="p-10" intensity="medium" lightMode={lightMode}>
                                <p
                                    className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#88161c]"
                                >
                                    Dirancang untuk
                                </p>
                                <h3
                                    className="mb-10 text-4xl font-light leading-tight"
                                    style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                    Kolaborasi yang<br />
                                    <span className="italic text-[#6B7280]">sederhana</span> dan<br />
                                    <span className="italic text-[#6B7280]">terukur.</span>
                                </h3>

                                <div className="flex flex-col gap-8">
                                    {steps.map((step, i) => (
                                        <motion.div
                                            key={step.number}
                                            initial={{ opacity: 0, x: -16 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: i * 0.12 }}
                                            className="flex items-center gap-6"
                                        >
                                            <span
                                                className="text-4xl font-light tabular-nums"
                                                style={{ color: 'rgba(136,22,28,0.15)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                            >
                                                0{step.number}
                                            </span>
                                            <span
                                                className="text-base font-medium"
                                                style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb' }}
                                            >
                                                {step.label}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Bottom tagline */}
                                <div
                                    className="mt-10 rounded-xl px-5 py-4"
                                    style={{
                                        background: 'rgba(136,22,28,0.06)',
                                        border: '1px solid rgba(136,22,28,0.1)',
                                    }}
                                >
                                    <p className="text-sm leading-relaxed text-[#6B7280]">
                                        Tidak perlu setup rumit. Kolabri dirancang agar dosen dan mahasiswa bisa langsung fokus pada yang penting — belajar bersama.
                                    </p>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>

                        {/* Right: step cards */}
                        <div className="flex flex-col">
                            <StepCard
                                number={1}
                                title="Buat Kelas & Grup"
                                description="Dosen membuat kelas baru, menambahkan mahasiswa, dan membentuk grup diskusi dengan konfigurasi yang fleksibel."
                                delay={0}
                                lightMode={lightMode}
                            />
                            <StepCard
                                number={2}
                                title="Diskusi & Kolaborasi"
                                description="Mahasiswa berdiskusi dalam grup sambil sistem secara otomatis memantau kualitas dan engagement setiap partisipan."
                                delay={0.15}
                                lightMode={lightMode}
                            />
                            <StepCard
                                number={3}
                                title="Analisis & Intervensi"
                                description="Dosen menerima insight real-time dan alert untuk memberikan bimbingan atau intervensi tepat waktu pada grup yang membutuhkan."
                                delay={0.3}
                                lightMode={lightMode}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
