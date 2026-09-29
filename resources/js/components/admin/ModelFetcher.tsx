import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { getProviderModels } from '@/lib/admin-provider-api';
import type { ModelMetadata } from '@/types/admin-provider';
import { toast } from '@/components/ui/toaster';

interface ModelFetcherProps {
    providerName: string;
    onModelSelect?: (modelId: string) => void;
}

export function ModelFetcher({ providerName, onModelSelect }: ModelFetcherProps) {
    const [models, setModels] = useState<ModelMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchModels = async (refresh = false) => {
        if (!providerName.trim()) {
            setError('Isi nama provider terlebih dahulu');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await getProviderModels(providerName.trim(), refresh);

            if (result.success) {
                setModels(result.models);
                toast.success(`Berhasil memuat ${result.models.length} model${result.cached ? ' (cache)' : ''}`);
            } else {
                setError(result.error || 'Gagal memuat daftar model');
                toast.error(result.error || 'Gagal memuat daftar model');
            }
        } catch (err) {
            const serverMsg =
                err && typeof err === 'object' && 'response' in err
                    ? ((err as { response?: { data?: { message?: string; reason?: string } } }).response?.data ??
                      {}).reason
                    : undefined;
            const errorMsg = serverMsg || (err instanceof Error ? err.message : 'Gagal memuat daftar model');
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!providerName.trim()) {
        return null;
    }

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-medium text-brand-dark dark:text-gray-200">
                    Model tersedia
                </h4>
                <button
                    type="button"
                    onClick={() => handleFetchModels(true)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-primary transition hover:bg-brand-primary/10 disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <RefreshCw className="h-3 w-3" />
                    )}
                    {loading ? 'Mengambil...' : 'Ambil model'}
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
            )}

            {models.length > 0 ? (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                    {models.map((model) => (
                        <button
                            key={model.id}
                            type="button"
                            onClick={() => onModelSelect?.(model.id)}
                            className="w-full rounded-md border border-slate-200 bg-white p-2 text-left transition hover:border-brand-primary hover:bg-brand-primary/5 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-brand-primary"
                        >
                            <div className="font-medium text-sm text-brand-dark dark:text-gray-200">
                                {model.name}
                            </div>
                            <div className="text-xs text-brand-muted-dark dark:text-gray-400">
                                {model.id}
                                {model.contextWindow && ` • ${model.contextWindow.toLocaleString()} tokens`}
                            </div>
                            {model.description && (
                                <div className="mt-1 text-xs text-brand-muted-dark dark:text-gray-500">
                                    {model.description}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-brand-muted-dark dark:text-gray-400">
                    Klik "Ambil model" untuk memuat daftar model dari {providerName}
                </p>
            )}
        </div>
    );
}
