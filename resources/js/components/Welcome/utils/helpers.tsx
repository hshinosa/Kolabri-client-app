import { motion, useInView } from 'framer-motion';
import { AlertTriangle, BarChart3, BookOpen, GraduationCap, LayoutDashboard, LineChart, MessageSquare, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Animated counter hook
export function useCounter(end: number, duration = 2000, startOnView = true) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });
    useEffect(() => {
        if (!inView && startOnView) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [inView, end, duration, startOnView]);
    return { count, ref };
}

// Liquid glass hover pill wraps any nav item
export function GlassPill({
    children,
    href,
    onClick,
    isActive = false,
    lightMode = true,
    className = '',
    style = {},
}: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
    lightMode?: boolean;
    className?: string;
    style?: React.CSSProperties;
}) {
    const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const glassStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '9999px',
        padding: '6px 14px',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        isolation: 'isolate',
        background: isActive 
            ? 'rgba(136,22,28,0.12)' 
            : lightMode
                ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isActive 
            ? '1px solid rgba(136,22,28,0.25)' 
            : lightMode 
                ? '1px solid rgba(255,255,255,0.5)' 
                : '1px solid rgba(255,255,255,0.15)',
        boxShadow: isActive
            ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(136,22,28,0.15)'
            : hovered
              ? lightMode
                ? 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 16px rgba(0,0,0,0.1)'
                : 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.25)'
              : lightMode
                ? 'inset 0 1px 0 rgba(255,255,255,0.5)'
                : 'inset 0 1px 0 rgba(255,255,255,0.1)',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
        ...style,
    };

    const spotlightStyle: React.CSSProperties = {
        position: 'absolute',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)`,
        transform: `translate(${pos.x - 40}px, ${pos.y - 40}px)`,
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
    };

    const Tag = href ? 'a' : 'button';
    return (
        <Tag
            ref={ref as React.Ref<HTMLAnchorElement & HTMLButtonElement>}
            href={href}
            onClick={(e) => {
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
                }
                if (onClick) onClick();
            }}
            style={glassStyle}
            className={className}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={spotlightStyle} />
            <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
        </Tag>
    );
}

// Primary CTA button (red gradient) with spotlight hover
export function PrimaryButton({
    children,
    href,
    onClick,
    className = '',
    disabled = false,
}: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}) {
    const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const baseStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: '9999px',
        padding: '16px 32px',
        cursor: 'pointer',
        overflow: 'hidden',
        isolation: 'isolate',
        fontSize: '14px',
        fontWeight: 500,
        color: 'white',
        background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: hovered
            ? 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2), 0 12px 40px rgba(136,22,28,0.55)'
            : 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(136,22,28,0.4)',
        transform: pressed ? 'scale(0.97) translateZ(0)' : 'translateZ(0)',
        transition: 'box-shadow 0.2s ease, transform 0.1s ease',
        willChange: 'transform',
    };

    const spotlightStyle: React.CSSProperties = {
        position: 'absolute',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 70%)',
        transform: `translate(${pos.x - 60}px, ${pos.y - 60}px)`,
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
    };

    const Tag = href ? 'a' : 'button';
    return (
        <Tag
            ref={ref as React.Ref<HTMLAnchorElement & HTMLButtonElement>}
            href={href}
            onClick={(e) => {
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    document.getElementById(href.substring(1))?.scrollIntoView({ behavior: 'smooth' });
                }
                if (onClick) onClick();
            }}
            style={baseStyle}
            className={`${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => !disabled && setPressed(false)}
            disabled={disabled}
        >
            <div style={spotlightStyle} />
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {children}
            </span>
        </Tag>
    );
}

// Secondary CTA button (glass/transparent) with spotlight hover
export function SecondaryButton({
    children,
    href,
    onClick,
    lightMode = true,
    className = '',
}: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    lightMode?: boolean;
    className?: string;
}) {
    const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const baseStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: '9999px',
        padding: '16px 32px',
        cursor: 'pointer',
        overflow: 'hidden',
        isolation: 'isolate',
        fontSize: '14px',
        fontWeight: 500,
        color: lightMode ? '#1e293b' : '#e5e7eb',
        background: lightMode
            ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: lightMode ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
        boxShadow: hovered
            ? (lightMode
                ? 'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.12)'
                : 'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 24px rgba(0,0,0,0.3)')
            : (lightMode
                ? 'inset 0 1px 0 rgba(255,255,255,0.5)'
                : 'inset 0 1px 0 rgba(255,255,255,0.1)'),
        transform: pressed ? 'scale(0.97) translateZ(0)' : 'translateZ(0)',
        transition: 'background 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
        willChange: 'transform',
    };

    const spotlightStyle: React.CSSProperties = {
        position: 'absolute',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)`,
        transform: `translate(${pos.x - 60}px, ${pos.y - 60}px)`,
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
    };

    const Tag = href ? 'a' : 'button';
    return (
        <Tag
            ref={ref as React.Ref<HTMLAnchorElement & HTMLButtonElement>}
            href={href}
            onClick={(e) => {
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    document.getElementById(href.substring(1))?.scrollIntoView({ behavior: 'smooth' });
                }
                if (onClick) onClick();
            }}
            style={baseStyle}
            className={className}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
        >
            <div style={spotlightStyle} />
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {children}
            </span>
        </Tag>
    );
}

// Hook to detect prefers-reduced-motion
function useReducedMotion() {
    const [prefersReduced, setPrefersReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReduced(mq.matches);
        const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return prefersReduced;
}

export function OrganicBlob({
    className,
    delay = 0,
    color = 'rgba(99, 102, 241, 0.15)',
    size = 400,
}: {
    className?: string;
    delay?: number;
    color?: string;
    size?: number;
}) {
    const prefersReduced = useReducedMotion();
    return (
        <motion.div
            className={`absolute rounded-full blur-3xl ${className}`}
            style={{
                width: size,
                height: size,
                background: `radial-gradient(circle at 30% 30%, ${color}, rgba(255,255,255,0) 70%)`,
            }}
            initial={{
                scale: 0.8,
                x: 0,
                y: 0,
            }}
            animate={
                prefersReduced
                    ? { scale: 1, x: 0, y: 0 }
                    : {
                          scale: [0.8, 1.1, 0.9, 1, 0.8],
                          x: [0, 30, -20, 10, 0],
                          y: [0, -20, 30, -10, 0],
                      }
            }
            transition={
                prefersReduced
                    ? { duration: 0.3 }
                    : {
                          duration: 20,
                          delay,
                          repeat: Infinity,
                          ease: 'easeInOut',
                      }
            }
        />
    );
}

// Liquid glass card component
export function LiquidGlassCard({
    children,
    className = '',
    intensity = 'medium',
    lightMode = false,
}: {
    children: React.ReactNode;
    className?: string;
    intensity?: 'light' | 'medium' | 'heavy';
    lightMode?: boolean;
}) {
    const blurMap = {
        light: 'blur(8px)',
        medium: 'blur(16px)',
        heavy: 'blur(24px)',
    };

    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{
                background: lightMode
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                backdropFilter: blurMap[intensity],
                WebkitBackdropFilter: blurMap[intensity],
                border: lightMode ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                willChange: 'transform',
            }}
        >
            {/* Inner glow */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: lightMode
                        ? 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 50%)'
                        : 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 50%)',
                }}
            />
            {/* Chromatic edge */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    boxShadow: lightMode
                        ? 'inset 0 0 0 1px rgba(255,255,255,0.4), inset 1px 0 0 0 rgba(136,22,28,0.06), inset -1px 0 0 0 rgba(136,22,28,0.04)'
                        : 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 1px 0 0 0 rgba(136,22,28,0.05), inset -1px 0 0 0 rgba(136,22,28,0.03)',
                    borderRadius: '24px',
                }}
            />
            {children}
        </div>
    );
}

// Feature card with liquid glass effect and mouse-tracking spotlight
export function LiquidFeatureCard({
    icon,
    title,
    description,
    delay = 0,
    color = 'indigo',
    lightMode = false,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay?: number;
    color?: string;
    lightMode?: boolean;
}) {
    const colorMap: Record<string, { bg: string; bgLight: string; text: string; textLight: string; glow: string }> = {
        indigo: {
            bg: 'rgba(136,22,28,0.12)',
            bgLight: 'rgba(136,22,28,0.08)',
            text: 'text-[#88161c]',
            textLight: 'text-[#88161c]',
            glow: 'rgba(136,22,28,0.10)',
        },
        cyan: {
            bg: 'rgba(136,22,28,0.10)',
            bgLight: 'rgba(136,22,28,0.07)',
            text: 'text-[#88161c]',
            textLight: 'text-[#88161c]',
            glow: 'rgba(136,22,28,0.08)',
        },
        emerald: {
            bg: 'rgba(136,22,28,0.14)',
            bgLight: 'rgba(136,22,28,0.09)',
            text: 'text-[#88161c]',
            textLight: 'text-[#88161c]',
            glow: 'rgba(136,22,28,0.12)',
        },
        amber: {
            bg: 'rgba(136,22,28,0.11)',
            bgLight: 'rgba(136,22,28,0.07)',
            text: 'text-[#88161c]',
            textLight: 'text-[#88161c]',
            glow: 'rgba(136,22,28,0.09)',
        },
        rose: {
            bg: 'rgba(136,22,28,0.13)',
            bgLight: 'rgba(136,22,28,0.08)',
            text: 'text-[#88161c]',
            textLight: 'text-[#88161c]',
            glow: 'rgba(136,22,28,0.11)',
        },
    };

    const colors = colorMap[color] || colorMap.indigo;

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className="group relative h-full"
        >
            <div className="h-full">
                <LiquidGlassCard className="h-full p-8" intensity="medium" lightMode={lightMode}>
                    {/* Icon container */}
                    <div
                        className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                        style={{
                            background: lightMode ? colors.bgLight : colors.bg,
                            border: lightMode ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div className={lightMode ? colors.textLight : colors.text}>{icon}</div>
                    </div>

                    <h3
                        className="relative z-10 mb-3 text-xl font-semibold"
                        style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {title}
                    </h3>
                    <p className="relative z-10 text-sm leading-relaxed text-[#6B7280]">{description}</p>
                </LiquidGlassCard>
            </div>
        </motion.div>
    );
}

// Animated step card for How It Works
export function StepCard({
    number,
    title,
    description,
    delay = 0,
    lightMode = false,
}: {
    number: number;
    title: string;
    description: string;
    delay?: number;
    lightMode?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className="group relative"
        >
            <LiquidGlassCard className="p-8" intensity="light" lightMode={lightMode}>
                <div className="flex items-start gap-6">
                    {/* Number */}
                    <div className="flex-shrink-0">
                        <div
                            className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-light"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 100%)',
                                border: '1px solid rgba(136,22,28,0.2)',
                                color: '#88161c',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px rgba(136,22,28,0.08)',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                        >
                            {number}
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3
                            className="mb-2 text-xl font-semibold"
                            style={{ color: lightMode ? '#4A4A4A' : '#e5e7eb', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            {title}
                        </h3>
                        <p className="text-sm leading-relaxed text-[#6B7280]">{description}</p>
                    </div>
                </div>
            </LiquidGlassCard>

            {/* Connecting line */}
            {number < 3 && (
                <div className="flex justify-center py-2">
                    <div className="h-8 w-px" style={{ background: 'linear-gradient(to bottom, rgba(136,22,28,0.2), rgba(136,22,28,0))' }} />
                </div>
            )}
        </motion.div>
    );
}

// Hero dashboard preview with liquid glass effect - Light Mode
export function HeroDashboard({ lightMode = true }: { lightMode?: boolean }) {
    const groupData = [
        { name: 'Grup A', score: 78, status: 'Aktif', color: 'emerald' },
        { name: 'Grup B', score: 65, status: 'Perlu Atensi', color: 'amber' },
        { name: 'Grup C', score: 45, status: 'Intervensi', color: 'rose' },
        { name: 'Grup D', score: 82, status: 'Aktif', color: 'emerald' },
    ];

    const t = (light: string, dark: string) => (lightMode ? light : dark);

    return (
        <LiquidGlassCard className="overflow-hidden" intensity="heavy" lightMode={lightMode}>
            {/* Browser chrome */}
            <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                    borderBottom: t('1px solid rgba(148,163,184,0.2)', '1px solid rgba(255,255,255,0.08)'),
                    background: t('rgba(248,250,252,0.6)', 'rgba(255,255,255,0.025)'),
                }}
            >
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-400/60" />
                    <div className="h-3 w-3 rounded-full bg-amber-400/60" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400/60" />
                </div>
                <div className="ml-4 flex-1">
                    <div
                        className="mx-auto w-full max-w-xs rounded-full px-4 py-1.5 text-center text-xs"
                        style={{
                            background: t('rgba(241,245,249,0.7)', 'rgba(255,255,255,0.06)'),
                            color: t('#64748b', '#94a3b8'),
                            border: t('1px solid rgba(148,163,184,0.15)', '1px solid rgba(255,255,255,0.08)'),
                        }}
                    >
                        kolabri.app/dashboard
                    </div>
                </div>
            </div>

            {/* Dashboard content */}
            <div className="flex">
                {/* Sidebar */}
                <div
                    className="hidden w-48 flex-shrink-0 lg:block"
                    style={{
                        borderRight: t('1px solid rgba(148,163,184,0.15)', '1px solid rgba(255,255,255,0.06)'),
                        background: t('rgba(248,250,252,0.4)', 'rgba(255,255,255,0.02)'),
                    }}
                >
                    <div className="p-4">
                        <div className="mb-6 flex items-center gap-2">
                            <div
                                className="flex h-7 w-7 items-center justify-center rounded-lg"
                                style={{ background: t('rgba(254,242,242,0.8)', 'rgba(136,22,28,0.15)') }}
                            >
                                <BookOpen className="h-3.5 w-3.5 text-[#88161c]" />
                            </div>
                            <span className="text-sm font-medium" style={{ color: t('#334155', '#e2e8f0') }}>
                                Kolabri
                            </span>
                        </div>

                        <div className="space-y-1">
                            {['Dasbor', 'Analitik', 'Kelas', 'Grup'].map((item, i) => (
                                <div
                                    key={item}
                                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                                    style={{
                                        background: i === 0 ? t('rgba(254,242,242,0.8)', 'rgba(136,22,28,0.15)') : 'transparent',
                                        color: i === 0 ? '#88161c' : t('#64748b', '#94a3b8'),
                                    }}
                                >
                                    {i === 0 && <LayoutDashboard className="h-3.5 w-3.5" />}
                                    {i === 1 && <LineChart className="h-3.5 w-3.5" />}
                                    {i === 2 && <GraduationCap className="h-3.5 w-3.5" />}
                                    {i === 3 && <Users className="h-3.5 w-3.5" />}
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-5">
                    {/* Metrics */}
                    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            { label: 'Grup Aktif', value: '12', icon: <Users className="h-3.5 w-3.5" /> },
                            { label: 'Total Pesan', value: '1,847', icon: <MessageSquare className="h-3.5 w-3.5" /> },
                            { label: 'Kualitas', value: '72.4', icon: <BarChart3 className="h-3.5 w-3.5" /> },
                            { label: 'Alerts', value: '3', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
                        ].map((metric, i) => (
                            <div
                                key={i}
                                className="rounded-xl p-3"
                                style={{
                                    background: t('rgba(248,250,252,0.7)', 'rgba(255,255,255,0.05)'),
                                    border: t('1px solid rgba(148,163,184,0.15)', '1px solid rgba(255,255,255,0.07)'),
                                }}
                            >
                                <div className="mb-1 flex items-center gap-1.5" style={{ color: t('#94a3b8', '#64748b') }}>
                                    {metric.icon}
                                    <span className="text-[10px] tracking-wider uppercase">{metric.label}</span>
                                </div>
                                <p className="text-lg font-semibold" style={{ color: t('#1e293b', '#e2e8f0') }}>
                                    {metric.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Alert */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="mb-4 rounded-xl p-3"
                        style={{
                            background: t('rgba(255,251,235,0.8)', 'rgba(180,120,0,0.10)'),
                            border: t('1px solid rgba(245,158,11,0.2)', '1px solid rgba(245,158,11,0.2)'),
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg"
                                style={{ background: t('rgba(253,230,138,0.5)', 'rgba(245,158,11,0.15)') }}
                            >
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: t('#92400e', '#fcd34d') }}>
                                    Grup C membutuhkan intervensi
                                </p>
                                <p className="text-xs" style={{ color: t('#b45309', '#d97706') }}>
                                    Skor kualitas diskusi turun ke 45
                                </p>
                            </div>
                            <button
                                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                                style={{ background: t('rgba(253,230,138,0.4)', 'rgba(245,158,11,0.15)'), color: t('#92400e', '#fcd34d') }}
                            >
                                Lihat
                            </button>
                        </div>
                    </motion.div>

                    {/* Group list */}
                    <div
                        className="rounded-xl"
                        style={{
                            background: t('rgba(248,250,252,0.4)', 'rgba(255,255,255,0.025)'),
                            border: t('1px solid rgba(148,163,184,0.15)', '1px solid rgba(255,255,255,0.07)'),
                        }}
                    >
                        <div
                            className="px-4 py-2.5"
                            style={{ borderBottom: t('1px solid rgba(148,163,184,0.15)', '1px solid rgba(255,255,255,0.06)') }}
                        >
                            <span className="text-xs font-medium" style={{ color: t('#475569', '#94a3b8') }}>
                                Analisis Grup Real-time
                            </span>
                        </div>
                        <div>
                            {groupData.map((group, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                                    className="flex items-center justify-between px-4 py-3"
                                    style={{
                                        borderBottom:
                                            i < groupData.length - 1
                                                ? t('1px solid rgba(148,163,184,0.1)', '1px solid rgba(255,255,255,0.04)')
                                                : 'none',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium"
                                            style={{
                                                background: t('rgba(241,245,249,0.9)', 'rgba(255,255,255,0.07)'),
                                                color: t('#475569', '#94a3b8'),
                                            }}
                                        >
                                            {group.name.split(' ')[1]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: t('#1e293b', '#e2e8f0') }}>
                                                {group.name}
                                            </p>
                                            <p className="text-[10px]" style={{ color: t('#94a3b8', '#64748b') }}>
                                                {group.status}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`text-lg font-semibold ${
                                                group.color === 'emerald'
                                                    ? 'text-emerald-500'
                                                    : group.color === 'amber'
                                                      ? 'text-amber-500'
                                                      : 'text-rose-500'
                                            }`}
                                        >
                                            {group.score}
                                        </span>
                                        <div
                                            className="h-1.5 w-16 overflow-hidden rounded-full"
                                            style={{ background: t('rgba(148,163,184,0.25)', 'rgba(255,255,255,0.08)') }}
                                        >
                                            <motion.div
                                                className={`h-full rounded-full ${
                                                    group.color === 'emerald'
                                                        ? 'bg-emerald-500'
                                                        : group.color === 'amber'
                                                          ? 'bg-amber-500'
                                                          : 'bg-rose-500'
                                                }`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${group.score}%` }}
                                                transition={{ delay: 0.5 + i * 0.15, duration: 0.8, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </LiquidGlassCard>
    );
}

// Animated Stat metric for stats section
export function StatMetric({ value, suffix, label, delay = 0 }: { value: number; suffix?: string; label: string; delay?: number }) {
    const { count, ref } = useCounter(value, 2200);
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center gap-1"
        >
            <span
                ref={ref}
                className="text-5xl font-light tracking-tight md:text-6xl"
                style={{ color: '#88161c', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
                {count.toLocaleString()}
                {suffix}
            </span>
            <span className="max-w-[120px] text-center text-sm text-[#6B7280]">{label}</span>
        </motion.div>
    );
}

// Interactive Chat Demo component
export function InteractiveChatDemo({ lightMode = true }: { lightMode?: boolean }) {
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollBoxRef = useRef<HTMLDivElement>(null);
    const inView = useInView(containerRef, { once: false, margin: '-100px' });
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const messages = [
        { from: 'student', name: 'Andi', text: 'Apa perbedaan antara REST dan GraphQL?', delay: 0 },
        { from: 'student', name: 'Budi', text: 'REST lebih umum dipakai ya? Tapi aku kurang paham trade-off-nya.', delay: 900 },
        { from: 'student', name: 'Citra', text: 'Hmm, setuju. API kita juga REST, tapi aku dengar GraphQL lebih fleksibel.', delay: 1900 },
        {
            from: 'ai',
            name: 'AI Kolabri',
            text: 'Diskusi kalian sudah menyentuh trade-off. Coba eksplorasi lebih dalam: kapan REST lebih cocok vs GraphQL dari sisi over-fetching?',
            delay: 3100,
        },
        {
            from: 'student',
            name: 'Andi',
            text: 'Oh! Jadi REST bisa over-fetch data yang tidak dipakai, sedangkan GraphQL hanya meminta field yang dibutuhkan.',
            delay: 4400,
        },
    ];

    const clearAll = () => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
        if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };

    const runDemo = () => {
        clearAll();
        setStep(0);
        setRunning(true);
        messages.forEach((_, i) => {
            const t = setTimeout(() => {
                setStep(i + 1);
                if (i === messages.length - 1) {
                    setRunning(false);
                    // Auto-loop: restart after 3s pause
                    loopTimeoutRef.current = setTimeout(runDemo, 3000);
                }
            }, messages[i].delay + 300);
            timeoutsRef.current.push(t);
        });
    };

    // Scroll only inside the chat box, never the page
    useEffect(() => {
        const el = scrollBoxRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [step]);

    // Auto-start when scrolled into view, stop when out
    useEffect(() => {
        if (inView) {
            runDemo();
        } else {
            clearAll();
            setStep(0);
            setRunning(false);
        }
        return () => clearAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView]);

    const visibleMessages = messages.slice(0, step);

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl"
            style={{
                background: lightMode ? 'rgba(255,255,255,0.6)' : 'rgba(18,18,28,0.75)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: lightMode ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: lightMode
                    ? 'inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 32px rgba(0,0,0,0.06)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.35)',
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                willChange: 'transform',
            }}
        >
            {/* Chat header */}
            <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: lightMode ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.07)' }}
            >
                <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400/70" />
                    <div className="h-3 w-3 rounded-full bg-amber-400/70" />
                    <div className="h-3 w-3 rounded-full bg-green-400/70" />
                </div>
                <span className="text-xs font-medium text-[#6B7280]">Grup A Diskusi Sesi 3</span>
                <div className="ml-auto flex items-center gap-1.5">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-xs text-[#6B7280]">Live</span>
                </div>
            </div>

            {/* Messages fixed height, scrollable */}
            <div className="flex flex-col gap-3 overflow-y-auto px-4 py-4" style={{ height: '400px' }}>
                {visibleMessages.map((msg, i) => (
                    <motion.div
                        key={`${step}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                        className="flex items-start gap-2.5"
                    >
                        <div
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                            style={
                                msg.from === 'ai'
                                    ? {
                                          background: 'linear-gradient(135deg,rgba(136,22,28,0.15),rgba(136,22,28,0.08))',
                                          color: '#88161c',
                                          border: '1px solid rgba(136,22,28,0.2)',
                                      }
                                    : {
                                          background: lightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.09)',
                                          color: lightMode ? '#4A4A4A' : '#cbd5e1',
                                          border: lightMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
                                      }
                            }
                        >
                            {msg.name[0]}
                        </div>
                        <div className="flex max-w-[85%] flex-col gap-0.5">
                            <span
                                className="text-[10px] font-medium"
                                style={{ color: msg.from === 'ai' ? '#88161c' : lightMode ? '#4A4A4A' : '#cbd5e1' }}
                            >
                                {msg.name}
                            </span>
                            <div
                                className="rounded-xl px-3 py-2 text-sm leading-relaxed"
                                style={
                                    msg.from === 'ai'
                                        ? {
                                              background: lightMode ? 'rgba(136,22,28,0.06)' : 'rgba(136,22,28,0.14)',
                                              border: '1px solid rgba(136,22,28,0.2)',
                                              color: lightMode ? '#4A4A4A' : '#e5e7eb',
                                          }
                                        : {
                                              background: lightMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)',
                                              border: lightMode ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.09)',
                                              color: lightMode ? '#4A4A4A' : '#e5e7eb',
                                          }
                                }
                            >
                                {msg.text}
                            </div>
                        </div>
                    </motion.div>
                ))}
                {running && step < messages.length && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2.5">
                        <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                            style={{
                                background: lightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
                                color: lightMode ? '#4A4A4A' : '#9ca3af',
                            }}
                        ></div>
                        <div
                            className="flex items-center gap-1 rounded-xl px-3 py-3"
                            style={{
                                background: lightMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)',
                                border: lightMode ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(26, 14, 14, 0.09)',
                            }}
                        >
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6B7280] [animation-delay:0ms]" />
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6B7280] [animation-delay:150ms]" />
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6B7280] [animation-delay:300ms]" />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Footer */}
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: lightMode ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.07)' }}
            >
                <span className="text-xs text-[#6B7280]/60">Simulasi intervensi AI real-time</span>
                <button
                    onClick={runDemo}
                    disabled={running}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                        background: running ? (lightMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)') : 'rgba(136,22,28,0.1)',
                        border: '1px solid rgba(136,22,28,0.2)',
                        color: running ? '#9CA3AF' : '#88161c',
                        cursor: running ? 'not-allowed' : 'pointer',
                    }}
                >
                    Ulangi
                </button>
            </div>
        </div>
    );
}
