import { motion } from 'framer-motion';
import { Activity, BarChart3, Brain } from 'lucide-react';
import { InteractiveChatDemo, LiquidGlassCard } from './utils/helpers';

type Props = { lightMode: boolean };

export default function DemoSection({ lightMode }: Props) {
    return (
        <>
            {/* ========== INTERACTIVE DEMO SECTION ========== */}
            <section id="demo" className="relative py-32">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute top-1/4 right-0 h-96 w-96"
                        style={{
                            background: 'radial-gradient(ellipse at right, rgba(136,22,28,0.04) 0%, transparent 70%)',
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
                        <span className="mb-4 inline-block text-xl tracking-[0.2em] text-[#88161c] uppercase">Demo Interaktif</span>
                        <h2
                            className="text-3xl font-light tracking-tight md:text-4xl lg:text-5xl"
                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Lihat AI bekerja <span className="text-[#6B7280] italic">secara nyata</span>
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-base text-[#6B7280]">
                            Saat diskusi kelompok mulai dangkal, AI Kolabri hadir memberikan pertanyaan pemantik yang mendorong pemikiran tingkat
                            tinggi.
                        </p>
                    </motion.div>

                    <div className="grid items-center gap-12 lg:grid-cols-2">
                        {/* Left: description */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                            className="flex flex-col gap-6"
                        >
                            {[
                                {
                                    icon: <Activity className="h-5 w-5" />,
                                    title: 'Monitoring Kontinu',
                                    desc: 'Setiap pesan dianalisis secara real-time menggunakan taksonomi Gen-SRL untuk mendeteksi kualitas diskusi.',
                                },
                                {
                                    icon: <Brain className="h-5 w-5" />,
                                    title: 'Intervensi Tepat Waktu',
                                    desc: 'AI memberikan pertanyaan pemantik atau sumber belajar tambahan saat grup membutuhkan, tanpa mengganggu alur diskusi.',
                                },
                                {
                                    icon: <BarChart3 className="h-5 w-5" />,
                                    title: 'Insights untuk Dosen',
                                    desc: 'Setiap interaksi direkam sebagai event log yang dapat dianalisis dosen untuk memahami pola belajar kelompok.',
                                },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.12 }}
                                >
                                    <LiquidGlassCard className="p-5" intensity="light" lightMode={lightMode}>
                                        <div className="flex gap-4">
                                            <div
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                                style={{
                                                    background: 'rgba(136,22,28,0.08)',
                                                    border: '1px solid rgba(136,22,28,0.15)',
                                                    color: '#88161c',
                                                }}
                                            >
                                                {item.icon}
                                            </div>
                                            <div>
                                                <h4 className="mb-1 font-semibold" style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb' }}>
                                                    {item.title}
                                                </h4>
                                                <p className="text-sm leading-relaxed text-[#6B7280]">{item.desc}</p>
                                            </div>
                                        </div>
                                    </LiquidGlassCard>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Right: demo */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                        >
                            <InteractiveChatDemo lightMode={lightMode} />
                        </motion.div>
                    </div>
                </div>
            </section>
        </>
    );
}
