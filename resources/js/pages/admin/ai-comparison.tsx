import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Download, Loader2, Scale, Send } from 'lucide-react';
import { useMemo, useState } from 'react';

import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { toast } from '@/components/ui/toaster';
import AppLayout from '@/layouts/app-layout';

type ComparisonResult = {
    provider: string;
    model: string;
    response: string;
    tokens: number;
    cost: number;
    latencyMs: number;
};

const availableModels = [
    { label: 'GPT-4', value: 'openai:gpt-4' },
    { label: 'GPT-3.5 Turbo', value: 'openai:gpt-3.5-turbo' },
    { label: 'Claude 3.5 Sonnet', value: 'anthropic:claude-3-5-sonnet-20241022' },
    { label: 'Gemini 1.5 Pro', value: 'gemini:gemini-1.5-pro' },
];

const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

const inputClassName =
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#88161c] focus:outline-none focus:ring focus:ring-[#88161c]/20';

export default function AdminAiComparisonPage() {
    const [prompt, setPrompt] = useState('Explain the benefits of fallback AI providers for an education platform.');
    const [selectedModels, setSelectedModels] = useState<string[]>(['openai:gpt-4', 'anthropic:claude-3-5-sonnet-20241022']);
    const [results, setResults] = useState<ComparisonResult[]>([]);
    const [comparisonId, setComparisonId] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const totalCost = useMemo(() => results.reduce((sum, item) => sum + item.cost, 0), [results]);

    const toggleModel = (value: string) => {
        setSelectedModels((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    };

    const handleCompare = async () => {
        if (!prompt.trim()) {
            toast.error('Prompt wajib diisi.');
            return;
        }

        if (selectedModels.length === 0) {
            toast.error('Pilih minimal satu model untuk dibandingkan.');
            return;
        }

        setProcessing(true);

        try {
            const response = await axios.post<{ data: { comparisonId: string; results: ComparisonResult[] } }>('/admin/ai-compare', {
                prompt,
                models: selectedModels,
            });

            setComparisonId(response.data.data.comparisonId);
            setResults(response.data.data.results);
            toast.success('Perbandingan model berhasil dijalankan.');
        } catch {
            toast.error('Gagal menjalankan perbandingan model AI.');
        } finally {
            setProcessing(false);
        }
    };

    const handleExport = () => {
        if (results.length === 0) {
            toast.error('Belum ada hasil comparison untuk diexport.');
            return;
        }

        const payload = {
            comparisonId,
            prompt,
            results,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-comparison-${comparisonId ?? 'result'}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AppLayout title="AI Comparison">
            <Head title="Admin - AI Comparison" />

            <div className="space-y-6">
                <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#88161c]/15 bg-[#88161c]/8">
                            <Scale className="h-6 w-6 text-[#88161c]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold" style={headingStyle}>AI Comparison Tool</h1>
                            <p className="mt-2 max-w-3xl text-sm text-[#6B7280]">
                                Kirim prompt yang sama ke beberapa model sekaligus, lalu bandingkan response, token, biaya, dan latency secara side-by-side.
                            </p>
                        </div>
                    </div>
                </LiquidGlassCard>

                <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                    <div>
                        <label className="text-sm font-medium text-[#4A4A4A]">Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            className={`${inputClassName} min-h-40`}
                            placeholder="Write the prompt you want to compare across models"
                        />
                    </div>

                    <div className="mt-6">
                        <p className="text-sm font-medium text-[#4A4A4A]">Available Models</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {availableModels.map((model) => {
                                const checked = selectedModels.includes(model.value);

                                return (
                                    <label key={model.value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${checked ? 'border-[#88161c]/30 bg-[#88161c]/5' : 'border-slate-200 bg-white/70'}`}>
                                        <input type="checkbox" checked={checked} onChange={() => toggleModel(model.value)} />
                                        <span className="text-sm font-medium text-[#4A4A4A]">{model.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                        <SecondaryButton onClick={handleExport} className="inline-flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Export JSON
                        </SecondaryButton>
                        <PrimaryButton onClick={handleCompare} disabled={processing} className="inline-flex items-center gap-2">
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Compare
                        </PrimaryButton>
                    </div>
                </LiquidGlassCard>

                <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-[#4A4A4A]">Results</h2>
                            <p className="mt-1 text-sm text-[#6B7280]">Comparison ID: {comparisonId ?? '-'}</p>
                        </div>
                        <div className="text-right text-sm text-[#6B7280]">
                            <p>Total cost</p>
                            <p className="font-semibold text-[#4A4A4A]">${totalCost.toFixed(4)}</p>
                        </div>
                    </div>

                    {results.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/40 px-5 py-10 text-center text-sm text-[#6B7280]">
                            Jalankan comparison untuk melihat hasil per model.
                        </div>
                    ) : (
                        <div className="mt-6 overflow-x-auto">
                            <table className="min-w-full divide-y divide-black/5 text-sm">
                                <thead className="bg-white/60 text-left text-[#6B7280]">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Model</th>
                                        <th className="px-4 py-3 font-medium">Response</th>
                                        <th className="px-4 py-3 font-medium">Tokens</th>
                                        <th className="px-4 py-3 font-medium">Cost</th>
                                        <th className="px-4 py-3 font-medium">Latency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 bg-white/30">
                                    {results.map((result) => (
                                        <tr key={`${result.provider}-${result.model}`}>
                                            <td className="px-4 py-4 align-top">
                                                <p className="font-semibold text-[#4A4A4A]">{result.model}</p>
                                                <p className="text-xs text-[#6B7280]">{result.provider}</p>
                                            </td>
                                            <td className="max-w-xl px-4 py-4 align-top text-[#4A4A4A]">{result.response}</td>
                                            <td className="px-4 py-4 align-top text-[#4A4A4A]">{result.tokens.toLocaleString('id-ID')}</td>
                                            <td className="px-4 py-4 align-top text-[#4A4A4A]">${result.cost.toFixed(4)}</td>
                                            <td className="px-4 py-4 align-top text-[#4A4A4A]">{(result.latencyMs / 1000).toFixed(2)}s</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </LiquidGlassCard>
            </div>
        </AppLayout>
    );
}
