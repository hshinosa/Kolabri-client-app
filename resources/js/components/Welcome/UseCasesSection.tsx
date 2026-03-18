import { motion } from 'framer-motion';
import { FileText, LayoutDashboard, LineChart } from 'lucide-react';
import { LiquidGlassCard } from './utils/helpers';

type Props = { lightMode: boolean };

const scenarios = [
    {
        icon: <FileText className="h-6 w-6" />,
        tag: 'Ilmu Komputer',
        title: 'Pemrograman Berbasis Proyek',
        desc: 'Kelompok mahasiswa mendiskusikan arsitektur sistem, membandingkan solusi teknis, dan AI membantu meluruskan miskonsepsi teknis secara real-time.',
        highlight: 'Diskusi teknis & code review',
        delay: 0,
    },
    {
        icon: <LineChart className="h-6 w-6" />,
        tag: 'Teknik & Bisnis',
        title: 'Desain Sistem & Manajemen',
        desc: 'Diskusi desain arsitektur atau strategi bisnis diperkaya dengan analisis mendalam. Dosen memantau progres tiap kelompok dari satu dashboard.',
        highlight: 'Monitoring progres kelompok',
        delay: 0.1,
    },
    {
        icon: <LayoutDashboard className="h-6 w-6" />,
        tag: 'Riset & Akademik',
        title: 'Metodologi Penelitian',
        desc: 'Mahasiswa menganalisis literatur bersama dalam kelompok kecil. AI mendorong pemikiran kritis dan dosen menerima laporan kualitas diskusi otomatis.',
        highlight: 'Analisis & refleksi kolaboratif',
        delay: 0.2,
    },
];

export default function UseCasesSection({ lightMode }: Props) {
    return (
        <>
            {/* ========== USE CASES SECTION ========== */}
            <section id="use-cases" className="relative py-32">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute top-1/2 -left-1/4 h-96 w-96 -translate-y-1/2"
                        style={{
                            background: 'radial-gradient(ellipse at left, rgba(136,22,28,0.04) 0%, transparent 70%)',
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
                        <span className="mb-4 inline-block text-xl tracking-[0.2em] text-[#88161c] uppercase">
                            Skenario Penggunaan
                        </span>
                        <h2
                            className="text-3xl font-light tracking-tight md:text-5xl lg:text-6xl"
                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Cocok untuk <span className="text-[#6B7280] italic">berbagai mata kuliah</span>
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-base text-[#6B7280]">
                            Kolabri dirancang fleksibel dan dapat digunakan di berbagai konteks pembelajaran berbasis diskusi kelompok.
                        </p>
                    </motion.div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {scenarios.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.6, delay: item.delay, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <LiquidGlassCard className="flex h-full flex-col p-8" intensity="light" lightMode={lightMode}>
                                    <div className="mb-5 flex items-start justify-between gap-3">
                                        <div
                                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                            style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                        >
                                            <div className="text-[#88161c]">{item.icon}</div>
                                        </div>
                                        <span
                                            className="rounded-full px-3 py-1 text-xs font-medium text-[#88161c]"
                                            style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                        >
                                            {item.tag}
                                        </span>
                                    </div>
                                    <h3
                                        className="mb-3 text-lg font-semibold"
                                        style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                    >
                                        {item.title}
                                    </h3>
                                    <p className="flex-1 text-sm leading-relaxed text-[#6B7280]">{item.desc}</p>
                                    <div
                                        className="mt-6 rounded-xl px-4 py-3 text-sm font-medium"
                                        style={{ background: 'rgba(136,22,28,0.06)', color: '#88161c', border: '1px solid rgba(136,22,28,0.12)' }}
                                    >
                                        {item.highlight}
                                    </div>
                                </LiquidGlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
