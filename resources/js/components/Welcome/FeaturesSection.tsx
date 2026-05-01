import { motion } from 'framer-motion';
import { Activity, Bell, BookOpen, Brain, BarChart3, MessageSquare } from 'lucide-react';
import { LiquidFeatureCard, useReducedMotion } from './utils/helpers';

type Props = { lightMode: boolean };

export default function FeaturesSection({ lightMode }: Props) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <>
            {/* ========== FEATURES SECTION ========== */}
            <section id="fitur" className="relative py-32">
                {/* Decorative floating shapes */}
                <motion.div
                    animate={
                        prefersReducedMotion
                            ? { y: 0, rotate: 0 }
                            : {
                                  y: [0, -20, 0],
                                  rotate: [0, 5, -5, 0],
                              }
                    }
                    transition={
                        prefersReducedMotion
                            ? { duration: 0.3 }
                            : { duration: 8, repeat: Infinity, ease: 'easeInOut' }
                    }
                    className="pointer-events-none absolute top-40 right-10 h-64 w-64 rounded-full opacity-20 blur-3xl"
                    style={{ background: lightMode ? 'rgba(136,22,28,0.08)' : 'rgba(164,18,25,0.15)' }}
                />
                <motion.div
                    animate={
                        prefersReducedMotion
                            ? { y: 0, x: 0 }
                            : {
                                  y: [0, 30, 0],
                                  x: [0, -20, 0],
                              }
                    }
                    transition={
                        prefersReducedMotion
                            ? { duration: 0.3 }
                            : { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }
                    }
                    className="pointer-events-none absolute bottom-20 left-10 h-80 w-80 rounded-full opacity-20 blur-3xl"
                    style={{ background: lightMode ? 'rgba(30,58,138,0.06)' : 'rgba(30,58,138,0.12)' }}
                />

                {/* Background accent */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute top-0 -left-1/4 h-full w-1/2"
                        style={{
                            background: 'radial-gradient(ellipse at left, rgba(136,22,28,0.04) 0%, rgba(255,255,255,0) 60%)',
                        }}
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
                        <span className="mb-4 inline-block text-xl tracking-[0.2em] text-[#88161c] uppercase">Fitur Unggulan</span>
                        <h2
                            className="mx-auto max-w-3xl text-3xl font-light tracking-tight md:text-4xl lg:text-5xl"
                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Semua yang Anda butuhkan untuk
                            <span className="text-[#6B7280] italic"> pembelajaran kolaboratif</span>
                        </h2>
                    </motion.div>

                    {/* Feature cards - Asymmetric grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <LiquidFeatureCard
                            icon={<Activity className="h-6 w-6" />}
                            title="Analitik Real-time"
                            description="Dashboard analitik real-time untuk memantau kualitas diskusi, engagement mahasiswa, dan metrik pembelajaran secara instan."
                            delay={0}
                            color="cyan"
                            lightMode={lightMode}
                        />
                        <LiquidFeatureCard
                            icon={<MessageSquare className="h-6 w-6" />}
                            title="Diskusi Kelompok"
                            description="Ruang diskusi terstruktur dengan tracking partisipasi otomatis dan analisis kualitas kontribusi setiap anggota."
                            delay={0.1}
                            color="indigo"
                            lightMode={lightMode}
                        />
                        <LiquidFeatureCard
                            icon={<Brain className="h-6 w-6" />}
                            title="Integrasi AI"
                            description="Chat spaces dengan AI assistant untuk membantu mahasiswa mendapatkan jawaban dan insight tambahan saat diskusi."
                            delay={0.2}
                            color="emerald"
                            lightMode={lightMode}
                        />
                        <LiquidFeatureCard
                            icon={<Bell className="h-6 w-6" />}
                            title="Intervensi Dosen"
                            description="Sistem alert cerdas yang memberi tahu dosen saat grup membutuhkan bimbingan atau intervensi tepat waktu."
                            delay={0.3}
                            color="amber"
                            lightMode={lightMode}
                        />
                        <LiquidFeatureCard
                            icon={<BookOpen className="h-6 w-6" />}
                            title="Refleksi Mahasiswa"
                            description="Platform refleksi pembelajaran untuk mahasiswa mencatat perkembangan, insights, dan pencapaian mereka."
                            delay={0.4}
                            color="rose"
                            lightMode={lightMode}
                        />
                        <LiquidFeatureCard
                            icon={<BarChart3 className="h-6 w-6" />}
                            title="Laporan Otomatis"
                            description="Generate laporan kualitas diskusi per sesi dan per grup secara otomatis, siap diunduh atau dibagikan ke mahasiswa."
                            delay={0.5}
                            color="cyan"
                            lightMode={lightMode}
                        />
                    </div>
                </div>
            </section>
        </>
    );
}
