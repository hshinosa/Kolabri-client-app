import { Head } from '@inertiajs/react';

/**
 * Halaman laporan analitik yang dibagikan (akses publik via token).
 * Halaman ini tidak ada sama sekali sehingga fitur "Bagikan Laporan"
 * selalu gagal meski token valid (dibuat 2026-10-06 saat audit E2E).
 */

interface SharedGroup {
    id?: string;
    name?: string;
    memberCount?: number;
    sessionDiscussionCount?: number;
    messageCount?: number;
    qualityScore?: number | null;
    needsAttention?: boolean;
}

interface SharedReport {
    section?: string;
    expiresAt?: string | null;
    generatedAt?: string;
    course?: { id?: string; name?: string; code?: string } | null;
    summary?: {
        totalGroups?: number;
        totalMessages?: number;
        averageQualityScore?: number | null;
        groupsNeedingAttention?: number;
    } | null;
    groups?: SharedGroup[];
}

export default function SharedReportPage({
    report,
    token,
}: {
    report: SharedReport | null;
    token: string;
}) {
    const summary = report?.summary ?? {};
    const groups = report?.groups ?? [];

    return (
        <div className="min-h-screen bg-gray-50 px-6 py-10">
            <Head title={`Laporan Analitik${report?.course?.code ? ` · ${report.course.code}` : ''}`} />
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Laporan Analitik Diskusi</p>
                    <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                        {report?.course?.name || 'Kelas'}
                        {report?.course?.code ? ` (${report.course.code})` : ''}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Bagian: {report?.section || 'overview'}
                        {report?.expiresAt ? ` · berlaku s.d. ${new Date(report.expiresAt).toLocaleString('id-ID')}` : ''}
                        {report?.generatedAt ? ` · dibuat ${new Date(report.generatedAt).toLocaleString('id-ID')}` : ''}
                    </p>
                    <p className="mt-1 break-all text-xs text-gray-400">Token: {token.slice(0, 24)}…</p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                        ['Kelompok', summary.totalGroups ?? groups.length],
                        ['Total Pesan', summary.totalMessages ?? 0],
                        ['Skor Rata-rata', summary.averageQualityScore ?? '-'],
                        ['Perlu Atensi', summary.groupsNeedingAttention ?? 0],
                    ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-xl border bg-white p-4">
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="mt-1 text-xl font-semibold text-gray-900">{String(value)}</p>
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-2xl border bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-4 py-3">Kelompok</th>
                                <th className="px-4 py-3">Anggota</th>
                                <th className="px-4 py-3">Sesi</th>
                                <th className="px-4 py-3">Pesan</th>
                                <th className="px-4 py-3">Skor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {groups.map((g, i) => (
                                <tr key={g.id || i}>
                                    <td className="px-4 py-3">{g.name || '-'}</td>
                                    <td className="px-4 py-3">{g.memberCount ?? '-'}</td>
                                    <td className="px-4 py-3">{g.sessionDiscussionCount ?? '-'}</td>
                                    <td className="px-4 py-3">{g.messageCount ?? '-'}</td>
                                    <td className="px-4 py-3">
                                        {g.qualityScore ?? '-'}
                                        {g.needsAttention ? ' ⚠️' : ''}
                                    </td>
                                </tr>
                            ))}
                            {groups.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                                        Belum ada data kelompok.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
