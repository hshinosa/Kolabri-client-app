import student from '@/routes/student';

export interface NavSubItem {
    name: string;
    href: string;
}

export interface NavItem {
    name: string;
    href: string;
    icon: React.ReactNode;
    active?: boolean;
    subItems?: NavSubItem[];
}

interface StudentNavContext {
    courseId?: string;
    groupId?: string;
    chatSpaceId?: string;
}

// Icons as separate components for reusability
const Icons = {
    courses: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    ),
    reflections: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    aiChat: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
    ),
};

type ActivePage = 'courses' | 'reflections' | 'ai-chat' | 'course-detail' | 'groups' | 'chat-spaces' | 'chat-room' | 'goals';

export function useStudentNav(activePage: ActivePage, context?: StudentNavContext): NavItem[] {
    const navItems: NavItem[] = [
        {
            name: 'Mata Kuliah Saya',
            href: student.courses.index.url(),
            icon: Icons.courses,
            active: ['courses', 'course-detail', 'groups', 'chat-spaces', 'chat-room', 'goals'].includes(activePage),
        },
        {
            name: 'Refleksi',
            href: student.reflections.index.url(),
            icon: Icons.reflections,
            active: activePage === 'reflections',
        },
        {
            name: 'Chat dengan AI',
            href: student.aiChat.index.url(),
            icon: Icons.aiChat,
            active: activePage === 'ai-chat',
        },
    ];

    // Add context-aware sub-items when inside a course
    if (context?.courseId && ['course-detail', 'groups', 'chat-spaces', 'chat-room', 'goals'].includes(activePage)) {
        navItems[0].subItems = [
            {
                name: 'Semua Mata Kuliah',
                href: student.courses.index.url(),
            },
            {
                name: 'Detail Kelas',
                href: student.courses.show.url({ course: context.courseId }),
            },
            {
                name: 'Sesi Diskusi',
                href: student.courses.chatSpaces.url({ course: context.courseId }),
            },
        ];
    }

    return navItems;
}

export { Icons as StudentNavIcons };
