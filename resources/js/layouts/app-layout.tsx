import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { PropsWithChildren, useState } from 'react';
import { BookOpen, LogOut, Menu, X } from 'lucide-react';

import { SharedData } from '@/types';
import auth from '@/routes/auth';
import { OrganicBlob } from '@/components/Welcome/utils/helpers';

interface NavSubItem {
    name: string;
    href: string;
}

interface NavItem {
    name: string;
    href: string;
    icon: React.ReactNode;
    active?: boolean;
    subItems?: NavSubItem[];
}

interface AppLayoutProps extends PropsWithChildren {
    title?: string;
    navItems?: NavItem[];
}

export default function AppLayout({ children, title, navItems = [] }: AppLayoutProps) {
    const { auth: authData, url } = usePage<SharedData>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>(() => {
        return navItems
            .filter(item => item.active && item.subItems && item.subItems.length > 0)
            .map(item => item.name);
    });

    const user = authData?.user;

    const toggleExpanded = (itemName: string) => {
        setExpandedItems(prev => 
            prev.includes(itemName) 
                ? prev.filter(name => name !== itemName)
                : [...prev, itemName]
        );
    };

    const isSubItemActive = (href: string) => {
        const currentUrl = typeof url === 'string' ? url : window.location.pathname;
        return currentUrl === href || currentUrl.startsWith(href + '/');
    };

    const renderNavItem = (item: NavItem, isMobile: boolean = false) => {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = expandedItems.includes(item.name);
        
        if (hasSubItems) {
            return (
                <div key={item.name}>
                    <button
                        onClick={() => toggleExpanded(item.name)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                            item.active
                                ? 'text-[#88161c]'
                                : 'text-[#4A4A4A] hover:text-[#88161c]'
                        }`}
                        style={{
                            background: item.active
                                ? 'rgba(136,22,28,0.08)'
                                : 'transparent',
                            border: item.active
                                ? '1px solid rgba(136,22,28,0.15)'
                                : '1px solid transparent',
                        }}
                    >
                        <span className={item.active ? 'text-[#88161c]' : 'text-[#6B7280]'}>
                            {item.icon}
                        </span>
                        <span className="flex-1 text-left">{item.name}</span>
                        <motion.svg 
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="h-4 w-4 text-[#6B7280]" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                    </button>
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-[#88161c]/20 pl-4">
                                    {item.subItems!.map((subItem) => (
                                        <Link
                                            key={subItem.name}
                                            href={subItem.href}
                                            onClick={isMobile ? () => setSidebarOpen(false) : undefined}
                                            className={`block rounded-lg px-3 py-2 text-sm transition-all ${
                                                isSubItemActive(subItem.href)
                                                    ? 'font-medium text-[#88161c]'
                                                    : 'text-[#6B7280] hover:text-[#4A4A4A]'
                                            }`}
                                        >
                                            {subItem.name}
                                        </Link>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        return (
            <Link
                key={item.name}
                href={item.href}
                onClick={isMobile ? () => setSidebarOpen(false) : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    item.active
                        ? 'text-[#88161c]'
                        : 'text-[#4A4A4A] hover:text-[#88161c]'
                }`}
                style={{
                    background: item.active
                        ? 'rgba(136,22,28,0.08)'
                        : 'transparent',
                    border: item.active
                        ? '1px solid rgba(136,22,28,0.15)'
                        : '1px solid transparent',
                }}
            >
                <span className={item.active ? 'text-[#88161c]' : 'text-[#6B7280]'}>
                    {item.icon}
                </span>
                {item.name}
                {item.active && !hasSubItems && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#88161c]" />
                )}
            </Link>
        );
    };

    return (
        <div 
            className="flex h-screen"
            style={{
                background: 'linear-gradient(135deg, #f5f0f0 0%, #e8e4f0 50%, #f0e8e8 100%)',
            }}
        >
            {/* Decorative blobs */}
            <OrganicBlob className="top-0 left-0" delay={0} color="rgba(136, 22, 28, 0.03)" size={400} />
            <OrganicBlob className="bottom-0 right-0" delay={-5} color="rgba(136, 22, 28, 0.02)" size={300} />

            {/* Sidebar - Desktop */}
            <aside 
                className="hidden w-72 flex-shrink-0 lg:block"
                style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.5)',
                }}
            >
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div 
                        className="flex h-20 items-center gap-3 px-6"
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.5)' }}
                    >
                        <div 
                            className="flex h-12 w-12 items-center justify-center rounded-2xl"
                            style={{
                                background: 'rgba(136,22,28,0.08)',
                                border: '1px solid rgba(136,22,28,0.12)',
                            }}
                        >
                            <img src="/LogoKolabri.webp" alt="Kolabri" className="h-8 w-8" />
                        </div>
                        <div>
                            <span 
                                className="text-xl font-bold"
                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Kolabri
                            </span>
                            <p className="text-xs text-[#6B7280]">Platform Kolaborasi</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
                        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                            Menu
                        </p>
                        {navItems.map((item) => renderNavItem(item, false))}
                    </nav>

                    {/* User Info */}
                    <div 
                        className="p-4"
                        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.5)' }}
                    >
                        <div 
                            className="flex items-center gap-3 rounded-2xl p-3"
                            style={{
                                background: 'rgba(255, 255, 255, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.5)',
                            }}
                        >
                            <div 
                                className="flex h-11 w-11 items-center justify-center rounded-full font-bold text-white"
                                style={{
                                    background: 'linear-gradient(135deg, #88161c 0%, #a41219 100%)',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                            >
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="truncate font-semibold text-[#4A4A4A]">
                                    {user?.name || 'User'}
                                </p>
                                <p className="truncate text-xs text-[#6B7280] capitalize">
                                    {user?.role || 'Tamu'}
                                </p>
                            </div>
                            <Link
                                href={auth.logout.url()}
                                method="post"
                                as="button"
                                className="rounded-xl p-2 text-[#6B7280] hover:text-[#88161c] transition-colors"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.5)',
                                }}
                                title="Keluar"
                            >
                                <LogOut className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 z-40 bg-black lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: -288 }}
                            animate={{ x: 0 }}
                            exit={{ x: -288 }}
                            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
                            className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
                            style={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(40px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                                borderRight: '1px solid rgba(255, 255, 255, 0.5)',
                            }}
                        >
                            <div className="flex h-full flex-col">
                                {/* Logo */}
                                <div 
                                    className="flex h-16 items-center justify-between px-4 sm:h-20 sm:px-6"
                                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.5)' }}
                                >
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div 
                                            className="flex h-10 w-10 items-center justify-center rounded-2xl sm:h-12 sm:w-12"
                                            style={{
                                                background: 'rgba(136,22,28,0.08)',
                                                border: '1px solid rgba(136,22,28,0.12)',
                                            }}
                                        >
                                            <img src="/LogoKolabri.webp" alt="Kolabri" className="h-7 w-7 sm:h-8 sm:w-8" />
                                        </div>
                                        <div>
                                            <span 
                                                className="text-lg font-bold sm:text-xl"
                                                style={{ color: '#4A4A4A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                            >
                                                Kolabri
                                            </span>
                                            <p className="text-xs text-[#6B7280]">Platform Kolaborasi</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSidebarOpen(false)}
                                        className="rounded-lg p-2 text-[#6B7280] hover:text-[#88161c]"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Navigation */}
                                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
                                    <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280] sm:mb-3">
                                        Menu
                                    </p>
                                    {navItems.map((item) => renderNavItem(item, true))}
                                </nav>

                                {/* User Info */}
                                <div 
                                    className="p-3 sm:p-4"
                                    style={{ borderTop: '1px solid rgba(255, 255, 255, 0.5)' }}
                                >
                                    <div 
                                        className="flex items-center gap-2 rounded-2xl p-2.5 sm:gap-3 sm:p-3"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.5)',
                                        }}
                                    >
                                        <div 
                                            className="flex h-9 w-9 items-center justify-center rounded-full text-base font-bold text-white sm:h-11 sm:w-11 sm:text-lg"
                                            style={{
                                                background: 'linear-gradient(135deg, #88161c 0%, #a41219 100%)',
                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                            }}
                                        >
                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-[#4A4A4A] sm:text-base">
                                                {user?.name || 'User'}
                                            </p>
                                            <p className="truncate text-xs text-[#6B7280] capitalize">
                                                {user?.role || 'Tamu'}
                                            </p>
                                        </div>
                                        <Link
                                            href={auth.logout.url()}
                                            method="post"
                                            as="button"
                                            className="flex-shrink-0 rounded-xl p-1.5 text-[#6B7280] hover:text-[#88161c] sm:p-2"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.5)',
                                            }}
                                            title="Keluar"
                                        >
                                            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">
                    {/* Mobile Menu Button */}
                    <div className="mb-4 lg:hidden">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#4A4A4A] transition-all"
                            style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.8)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                        >
                            <Menu className="h-5 w-5" />
                            Menu
                        </button>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
