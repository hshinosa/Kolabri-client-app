import { Link, usePage } from '@inertiajs/react';

import { SharedData } from '@/types';

interface AdminNavItem {
    name: string;
    href: string;
    icon: React.ReactNode;
}

interface AdminNavProps {
    isMobile?: boolean;
    onNavigate?: () => void;
}

const adminNavItems: AdminNavItem[] = [
    {
        name: 'Dashboard',
        href: '/admin/dashboard',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z"
                />
            </svg>
        ),
    },
    {
        name: 'User Management',
        href: '/admin/users',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
            </svg>
        ),
    },
    {
        name: 'Master Data',
        href: '/admin/master-data',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7h16M4 12h16M4 17h16"
                />
            </svg>
        ),
    },
    {
        name: 'AI Settings',
        href: '/admin/ai-settings',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 3.104v5.25m0 0a3 3 0 01-3 3H3m6.75-3a3 3 0 003 3h8.25m-8.25 0V21M14.25 3.104v17.792"
                />
            </svg>
        ),
    },
    {
        name: 'AI Comparison',
        href: '/admin/ai-comparison',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m6 10V11M4 19h16M4 5h16"
                />
            </svg>
        ),
    },
    {
        name: 'Audit Log',
        href: '/admin/audit-log',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                />
            </svg>
        ),
    },
];

const isItemActive = (currentUrl: string, href: string) => {
    return currentUrl === href || currentUrl.startsWith(href + '/');
};

export function AdminNav({ isMobile = false, onNavigate }: AdminNavProps) {
    const { url } = usePage<SharedData>().props;
    const currentUrl = typeof url === 'string' ? url : window.location.pathname;

    return (
        <>
            {adminNavItems.map((item) => {
                const active = isItemActive(currentUrl, item.href);

                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={isMobile ? onNavigate : undefined}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                            active ? 'text-[#88161c]' : 'text-[#4A4A4A] hover:text-[#88161c]'
                        }`}
                        style={{
                            background: active ? 'rgba(136,22,28,0.08)' : 'transparent',
                            border: active ? '1px solid rgba(136,22,28,0.15)' : '1px solid transparent',
                        }}
                    >
                        <span className={active ? 'text-[#88161c]' : 'text-[#6B7280]'}>{item.icon}</span>
                        {item.name}
                        {active && <span className="ml-auto h-2 w-2 rounded-full bg-[#88161c]" />}
                    </Link>
                );
            })}
        </>
    );
}
