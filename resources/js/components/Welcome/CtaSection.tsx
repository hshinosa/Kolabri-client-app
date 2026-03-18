import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { LiquidGlassCard, PrimaryButton, SecondaryButton } from './utils/helpers';

type Props = { lightMode: boolean };

export default function CtaSection({ lightMode }: Props) {
    return (
        <>
            {/* ========== CTA SECTION ========== */}
            <section id="cta" className="relative py-32">
                {/* Decorative CTA Background Glows */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute h-[500px] w-[500px] rounded-full blur-[100px]"
                        style={{ background: lightMode ? 'rgba(136,22,28,0.1)' : 'rgba(164,18,25,0.15)' }}
                    />
                </div>

                <div className="mx-auto max-w-4xl px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center"
                    >
                        {/* CTA Card */}
                        <LiquidGlassCard className="p-12 md:p-16" intensity="medium" lightMode={lightMode}>
                            <h2
                                className="mb-6 text-4xl font-light tracking-tight md:text-5xl lg:text-6xl"
                                style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Siap mulai <span className="text-[#6B7280] italic">kolaborasi</span> yang lebih bermakna?
                            </h2>
                            <p className="mx-auto mb-10 max-w-xl text-[#6B7280]">
                                Dikembangkan sebagai proyek penelitian di Telkom University. Mulai tingkatkan kualitas pembelajaran kolaboratif di kelas Anda hari ini.
                            </p>
                            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <PrimaryButton href="/register">
                                    Mulai Sekarang
                                    <ArrowRight className="h-4 w-4" />
                                </PrimaryButton>
                                <SecondaryButton href="/login" lightMode={lightMode}>
                                    Masuk
                                </SecondaryButton>
                            </div>
                            <p className="mt-6 text-xs text-[#6B7280]">
                                ✓ Setup kurang dari 5 menit &nbsp;·&nbsp; ✓ Dikembangkan di Telkom University &nbsp;·&nbsp; ✓ Untuk dosen & mahasiswa
                            </p>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </section>
        </>
    );
}
