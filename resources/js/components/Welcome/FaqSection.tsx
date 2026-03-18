import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { LiquidGlassCard } from './utils/helpers';

type Props = { lightMode: boolean };

const faqs = [
    {
        question: 'Siapa yang mengembangkan Kolabri?',
        answer: 'Kolabri dikembangkan sebagai proyek penelitian mahasiswa di Telkom University, dirancang khusus untuk mendukung pembelajaran kolaboratif di lingkungan perguruan tinggi.',
    },
    {
        question: 'Bagaimana data mahasiswa dilindungi?',
        answer: 'Keamanan data adalah prioritas kami. Semua data dienkripsi dan disimpan secara aman. Kami mengikuti standar keamanan data akademik dan hanya menggunakan data untuk keperluan analitik pembelajaran.',
    },
    {
        question: 'Apakah bisa diintegrasikan dengan LMS yang sudah ada?',
        answer: 'Saat ini Kolabri berjalan sebagai platform mandiri. Integrasi dengan LMS populer seperti Moodle dan Google Classroom ada dalam roadmap pengembangan kami.',
    },
    {
        question: 'Berapa jumlah mahasiswa yang bisa ditampung?',
        answer: 'Kolabri dirancang untuk menangani kelas dengan jumlah mahasiswa yang bervariasi, dari kelas kecil hingga kelas besar dengan ratusan mahasiswa.',
    },
    {
        question: 'Apa itu analitik SRL?',
        answer: 'SRL (Self-Regulated Learning) adalah kerangka kerja yang mengukur kemampuan mahasiswa dalam mengatur proses belajar mereka sendiri. Kolabri menganalisis 3 dimensi utama: perencanaan, monitoring, dan evaluasi diri.',
    },
    {
        question: 'Bagaimana cara memulai menggunakan Kolabri?',
        answer: 'Cukup daftar akun sebagai dosen, buat kelas baru, undang mahasiswa, dan mulai diskusi. Setup bisa dilakukan dalam waktu kurang dari 5 menit.',
    },
];

export default function FaqSection({ lightMode }: Props) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <>
            {/* ========== FAQ SECTION ========== */}
            <section id="faq" className="relative py-32">
                {/* Background glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute -right-1/4 top-0 h-full w-1/2"
                        style={{
                            background: 'radial-gradient(ellipse at right, rgba(136,22,28,0.04) 0%, rgba(255,255,255,0) 60%)',
                        }}
                    />
                </div>

                <div className="relative mx-auto max-w-3xl px-6">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="mb-16 text-center"
                    >
                        <span className="mb-4 inline-block text-xl tracking-[0.2em] text-[#88161c] uppercase">FAQ</span>
                        <h2
                            className="mx-auto max-w-3xl text-3xl font-light tracking-tight md:text-4xl lg:text-5xl"
                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Pertanyaan yang <span className="text-[#6B7280] italic">sering ditanyakan</span>
                        </h2>
                    </motion.div>

                    {/* FAQ items */}
                    <div className="flex flex-col gap-4">
                        {faqs.map((faq, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <LiquidGlassCard intensity="light" lightMode={lightMode} className="overflow-hidden">
                                    {/* Question button */}
                                    <button
                                        onClick={() => toggle(i)}
                                        className="flex w-full items-center justify-between px-6 py-5 text-left"
                                        aria-expanded={openIndex === i}
                                    >
                                        <span
                                            className="pr-4 text-sm font-medium md:text-base"
                                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                        >
                                            {faq.question}
                                        </span>
                                        <motion.span
                                            animate={{ rotate: openIndex === i ? 180 : 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="shrink-0"
                                        >
                                            <ChevronDown size={18} style={{ color: '#88161c' }} />
                                        </motion.span>
                                    </button>

                                    {/* Answer */}
                                    <AnimatePresence initial={false}>
                                        {openIndex === i && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                                            >
                                                <div className="border-t px-6 pb-5 pt-4" style={{ borderColor: lightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
                                                    <p className="text-sm leading-relaxed text-[#6B7280]">{faq.answer}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </LiquidGlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
