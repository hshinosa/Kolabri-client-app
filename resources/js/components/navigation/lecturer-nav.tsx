import { dashboard } from '@/routes'
import lecturer from '@/routes/lecturer'
import { NavItem } from './student-nav'

interface LecturerNavContext {
    courseId?: string;
    groupId?: string;
}

type ActivePage = 'dashboard' | 'courses' | 'course-create' | 'course-detail' | 'groups' | 'analytics' | 'analytics-group';

const Icons = {
    dashboard: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z" />
        </svg>
    ),
    courses: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
    ),
    analytics: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    ),
    groups: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    ),
}

export function useLecturerNav(activePage: ActivePage, context?: LecturerNavContext): NavItem[] {
    const navItems: NavItem[] = [
        {
            name: 'Dasbor',
            href: dashboard.url(),
            icon: Icons.dashboard,
            active: activePage === 'dashboard',
        },
        {
            name: 'Kelas Saya',
            href: lecturer.courses.index.url(),
            icon: Icons.courses,
            active: ['courses', 'course-create', 'course-detail', 'groups'].includes(activePage),
        },
        {
            name: 'Analytics',
            href: context?.courseId ? lecturer.analytics.index.url({ course: context.courseId }) : '#',
            icon: Icons.analytics,
            active: ['analytics', 'analytics-group'].includes(activePage),
        },
    ]

    if (context?.courseId && ['course-detail', 'groups', 'analytics', 'analytics-group'].includes(activePage)) {
        navItems[1].subItems = [
            {
                name: 'Semua Kelas',
                href: lecturer.courses.index.url(),
            },
            {
                name: 'Detail Kelas',
                href: lecturer.courses.show.url({ course: context.courseId }),
            },
            {
                name: 'Kelola Grup',
                href: lecturer.groups.index.url({ course: context.courseId }),
            },
        ]
    }

    if (context?.courseId && ['analytics', 'analytics-group'].includes(activePage)) {
        navItems[2].subItems = [
            {
                name: 'Ringkasan Analytics',
                href: lecturer.analytics.index.url({ course: context.courseId }),
            },
        ]

        if (context.groupId) {
            navItems[2].subItems?.push({
                name: 'Detail Grup',
                href: lecturer.analytics.group.url({ course: context.courseId, group: context.groupId }),
            })
        }
    }

    return navItems
}

export { Icons as LecturerNavIcons }
