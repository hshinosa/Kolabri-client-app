import { motion } from 'framer-motion';
import { LiquidGlassCard, StatMetric } from './utils/helpers';

type Props = { lightMode: boolean };

export default function StatsSection({ lightMode }: Props) {
    return (
        <>
            {/* ========== STATS SECTION ========== */}
            <section id="statistik" className="relative py-20">
                <div className="relative mx-auto max-w-5xl px-6">
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                        <LiquidGlassCard className="px-8 py-12 md:px-16" intensity="medium" lightMode={lightMode}>
                            <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
                                <StatMetric value={3} suffix="" label="Dimensi Analitik Pembelajaran" delay={0} />
                                <StatMetric value={10} suffix="+" label="Fitur Analitik & Kolaborasi" delay={0.1} />
                                <StatMetric value={50} suffix="+" label="Mahasiswa Terdukung" delay={0.2} />
                                <StatMetric value={100} suffix="%" label="Berbasis Riset Akademik" delay={0.3} />
                            </div>
                        </LiquidGlassCard>
                    </motion.div>
                </div>
            </section>
        </>
    );
}
