import { BarChart3, BookOpen, CalendarCheck, MessagesSquare } from 'lucide-react';

const tabs = [
    { id: 'aktivitas', label: 'Aktivitas', icon: BarChart3 },
    { id: 'sesi', label: 'Sesi & Analisis', icon: MessagesSquare },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'materi', label: 'Materi', icon: BookOpen },
] as const;

export type TabId = (typeof tabs)[number]['id'];

interface CourseDetailTabsProps {
    courseId: string;
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

export default function CourseDetailTabs({ courseId, activeTab, onTabChange }: CourseDetailTabsProps) {
    return (
        <div className="flex flex-wrap gap-1 rounded-2xl p-1.5" style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.6)' }}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
                        style={{
                            ...(isActive
                                ? {
                                      background: 'rgba(136,22,28,0.10)',
                                      color: '#88161c',
                                      border: '1px solid rgba(136,22,28,0.15)',
                                  }
                                : {
                                      background: 'transparent',
                                      color: '#6B7280',
                                      border: '1px solid transparent',
                                  }),
                        }}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}