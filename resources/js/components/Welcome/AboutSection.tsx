import { motion } from 'framer-motion';
import { Brain, GraduationCap, Users } from 'lucide-react';
import { LiquidGlassCard } from './utils/helpers';

type Props = { lightMode: boolean };

export default function AboutSection({ lightMode }: Props) {
    return (
        <>
            {/* ========== TENTANG SECTION ========== */}
            <section id="tentang" className="relative py-32">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{
                            width: 600,
                            height: 600,
                            background: 'radial-gradient(ellipse, rgba(136,22,28,0.04) 0%, transparent 70%)',
                            filter: 'blur(40px)',
                        }}
                    />
                </div>
                <div className="relative mx-auto max-w-7xl px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="mb-16 text-center"
                    >
                        <span className="mb-4 inline-block text-xl tracking-[0.2em] text-[#88161c] uppercase">Tentang Kolabri</span>
                        <h2
                            className="text-3xl font-light tracking-tight md:text-4xl lg:text-5xl"
                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Dibangun untuk <span className="text-[#6B7280] italic">pendidikan berkualitas</span>
                        </h2>
                    </motion.div>

                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            {
                                icon: <GraduationCap className="h-6 w-6" />,
                                title: 'Latar Belakang',
                                body: 'Kolabri lahir dari kebutuhan nyata di Telkom University membantu dosen memahami dinamika diskusi kelompok mahasiswa secara mendalam dan berbasis data.',
                                delay: 0,
                            },
                            {
                                icon: <Brain className="h-6 w-6" />,
                                title: 'Pendekatan',
                                body: 'Menggabungkan analitik real-time, kecerdasan buatan, dan desain yang berpusat pada pengguna untuk menciptakan pengalaman pembelajaran kolaboratif yang terukur.',
                                delay: 0.1,
                            },
                            {
                                icon: <Users className="h-6 w-6" />,
                                title: 'Untuk Siapa',
                                body: 'Dirancang untuk dosen yang ingin memantau dan meningkatkan kualitas diskusi, serta mahasiswa yang ingin berkontribusi dan berkembang dalam kolaborasi kelompok.',
                                delay: 0.2,
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.6, delay: item.delay, ease: [0.25, 0.1, 0.25, 1] }}
                                className="h-full"
                            >
                                <LiquidGlassCard className="h-full p-8" intensity="light" lightMode={lightMode}>
                                    <div
                                        className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                                        style={{
                                            background: 'rgba(136,22,28,0.08)',
                                            border: '1px solid rgba(136,22,28,0.12)',
                                        }}
                                    >
                                        <div className="text-[#88161c]">{item.icon}</div>
                                    </div>
                                    <h3
                                        className="mb-3 text-lg font-semibold"
                                        style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                    >
                                        {item.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-[#6B7280]">{item.body}</p>
                                </LiquidGlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
