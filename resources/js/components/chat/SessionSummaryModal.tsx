import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { BaseModal } from '@/components/ui/BaseModal';

interface SessionSummaryModalProps {
    goalAchieved: boolean;
    topics: string[];
    contributions: Record<string, number>;
    assessment: string;
    isLoading: boolean;
    onClose: () => void;
    goal?: string | null;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
    goalAchieved,
    topics,
    contributions,
    assessment,
    isLoading,
    onClose,
    goal,
}) => {
    return (
        <BaseModal
            open={true}
            title="Ringkasan Sesi Diskusi"
            onClose={onClose}
            size="lg"
            className="border border-white/50"
            closeOnOverlayClick
        >
            <div className="relative max-h-[90vh] overflow-y-auto p-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Tutup"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-5 pr-10">
                    <h2 className="text-xl font-bold text-brand-dark">Ringkasan Sesi Diskusi</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Berikut adalah ringkasan dari sesi diskusi yang baru saja selesai
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
                        <p className="mt-4 text-sm text-gray-600">Memproses penilaian tujuan...</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {goal ? (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Tujuan Pembelajaran
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-brand-dark">{goal}</p>
                            </div>
                        ) : null}

                        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4">
                            <div className="flex items-start gap-3">
                                {goalAchieved ? (
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100">
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                                        <AlertCircle className="h-6 w-6 text-yellow-600" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-semibold text-brand-dark">
                                        {goalAchieved
                                            ? 'Tujuan Pembelajaran Tercapai'
                                            : 'Tujuan Pembelajaran Belum Tercapai'}
                                    </p>
                                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                                        {assessment?.trim()
                                            ? assessment
                                            : goalAchieved
                                              ? 'Diskusi telah mencapai tujuan yang ditetapkan.'
                                              : 'Belum ada alasan penilaian. Perlu diskusi lebih lanjut untuk mencapai tujuan.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {topics.length > 0 && (
                            <div>
                                <h3 className="mb-3 text-base font-semibold text-brand-dark">Topik yang Dibahas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {topics.map((topic, index) => (
                                        <span
                                            key={`${topic}-${index}`}
                                            className="inline-flex items-center rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-medium text-brand-primary"
                                        >
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {Object.keys(contributions).length > 0 && (
                            <div>
                                <h3 className="mb-3 text-base font-semibold text-brand-dark">Kontribusi Peserta</h3>
                                <div className="overflow-hidden rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                                    Nama
                                                </th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                                    Jumlah Pesan
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {Object.entries(contributions)
                                                .sort(([, a], [, b]) => b - a)
                                                .map(([name, count]) => (
                                                    <tr key={name} className="transition-colors hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm text-gray-900">{name}</td>
                                                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                                            {count}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={onClose}
                                className="rounded-xl bg-brand-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default SessionSummaryModal;
