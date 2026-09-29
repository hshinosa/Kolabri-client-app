import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    MoreVertical,
    Plus,
    Power,
    Server,
    TestTube2,
    Trash2,
    UserPen,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { ModelFetcher } from '@/components/admin/ModelFetcher';
import Breadcrumbs from '@/components/dashboard/Breadcrumbs';
import { LiquidGlassCard, PrimaryButton, SecondaryButton } from '@/components/Welcome/utils/helpers';
import { FormModal } from '@/components/ui/FormModal';
import { InputError } from '@/components/ui/input-error';
import { SkeletonCard } from '@/components/ui/skeletons';
import { toast } from '@/components/ui/toaster';
import AppLayout from '@/layouts/app-layout';

interface AiProvider {
    id: string;
    name: string;
    displayName: string;
    apiKeyMasked: string;
    baseUrl?: string | null;
    isActive: boolean;
    fallbackOrder?: number;
    config?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

interface PageProps {
    providers: AiProvider[];
}

interface ProviderFormData {
    name: string;
    displayName: string;
    apiKey: string;
    baseUrl: string;
    config: string;
}


interface EmbeddingConfig {
    provider: string;
    voyageModel?: string | null;
    voyageOutputDimension?: number | null;
    voyageConfigured: boolean;
    localModel?: string | null;
    activeProvider: string;
    degraded: boolean;
}

interface TestResult {
    status: string;
    response: string;
    latency: number;
    model: string;
}

interface ApiErrorResponse {
    error?: {
        message?: string;
        details?: string | Record<string, string>;
    };
    message?: string;
    errors?: Record<string, string | string[]>;
}

const headingStyle = {
    color: 'var(--dm-text-heading)',
} as const;

const inputClassName =
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-brand-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2';

const buttonSpinner = <Loader2 className="h-4 w-4 animate-spin" />;

function formatDate(date?: string | null) {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function extractErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const payload = error.response?.data;

        if (payload?.error?.message) return payload.error.message;
        if (payload?.message) return payload.message;

        if (payload?.errors) {
            const firstError = Object.values(payload.errors)[0];
            if (typeof firstError === 'string') return firstError;
            if (Array.isArray(firstError) && firstError.length > 0) return firstError[0];
        }
    }

    return fallback;
}

function normalizeErrors(error: unknown): Record<string, string> {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return {};
    }

    const details = error.response?.data?.error?.details;
    if (details && typeof details === 'object' && !Array.isArray(details)) {
        return Object.entries(details).reduce<Record<string, string>>((acc, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = value;
            }
            return acc;
        }, {});
    }

    return {};
}

function ToggleSwitch({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onChange}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                checked ? 'bg-brand-primary' : 'bg-slate-300'
            } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}

function prettyConfig(config?: Record<string, unknown>) {
    if (!config || Object.keys(config).length === 0) {
        return '{\n  "models": [],\n  "defaultModel": "",\n  "temperature": 0.7,\n  "maxTokens": 2000\n}';
    }

    return JSON.stringify(config, null, 2);
}

function getProviderModel(provider: AiProvider) {
    const config = provider.config;

    if (!config || typeof config !== 'object') {
        return '-';
    }

    const defaultModel = config.defaultModel;
    if (typeof defaultModel === 'string' && defaultModel.trim().length > 0) {
        return defaultModel;
    }

    const directModel = config.model;
    if (typeof directModel === 'string' && directModel.trim().length > 0) {
        return directModel;
    }

    const models = config.models;
    if (Array.isArray(models) && models.length > 0) {
        const firstModel = models[0];

        if (typeof firstModel === 'string' && firstModel.trim().length > 0) {
            return firstModel;
        }

        if (firstModel && typeof firstModel === 'object' && !Array.isArray(firstModel)) {
            const modelCandidate = (firstModel as Record<string, unknown>).name
                ?? (firstModel as Record<string, unknown>).id
                ?? (firstModel as Record<string, unknown>).model;

            if (typeof modelCandidate === 'string' && modelCandidate.trim().length > 0) {
                return modelCandidate;
            }
        }
    }

    return '-';
}

function ProviderCard({
    provider,
    activatingId,
    onToggleActive,
    onTest,
    onEdit,
    onDelete,
}: {
    provider: AiProvider;
    activatingId: string | null;
    onToggleActive: (provider: AiProvider) => void;
    onTest: (provider: AiProvider) => void;
    onEdit: (provider: AiProvider) => void;
    onDelete: (provider: AiProvider) => void;
}) {
    return (
        <LiquidGlassCard intensity="light" className="p-4 transition-shadow duration-200" lightMode={true}>
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-dark dark:text-gray-100">{provider.displayName}</p>
                        <p className="mt-1 truncate text-xs text-slate-600 dark:text-gray-600">{provider.name}</p>
                    </div>
                    <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            provider.isActive
                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                    >
                        {provider.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-gray-600">
                    <p>
                        <span className="font-medium text-brand-dark dark:text-gray-200">Model:</span> {getProviderModel(provider)}
                    </p>
                    <p>
                        <span className="font-medium text-brand-dark dark:text-gray-200">Base URL:</span> {provider.baseUrl || '-'}
                    </p>
                    <p>
                        <span className="font-medium text-brand-dark dark:text-gray-200">Diperbarui:</span> {formatDate(provider.updatedAt)}
                    </p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5">
                    <span className="text-xs font-medium text-brand-dark dark:text-gray-200">Jadikan aktif</span>
                    <div className="flex items-center gap-2">
                        <ToggleSwitch
                            checked={provider.isActive}
                            disabled={activatingId === provider.id}
                            onChange={() => onToggleActive(provider)}
                        />
                        {activatingId === provider.id ? buttonSpinner : null}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => onTest(provider)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-brand-primary/35 dark:border-white/20 dark:bg-white/5 dark:text-gray-200 dark:hover:border-brand-primary/50"
                    >
                        Uji
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(provider)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-brand-primary/35 dark:border-white/20 dark:bg-white/5 dark:text-gray-200 dark:hover:border-brand-primary/50"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(provider)}
                        className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:hover:bg-rose-900/30"
                    >
                        Hapus
                    </button>
                </div>
            </div>
        </LiquidGlassCard>
    );
}

export default function AdminAiSettingsPage({ providers }: PageProps) {
    const [providerList, setProviderList] = useState<AiProvider[]>(providers);
    const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null);

    const [createForm, setCreateForm] = useState<ProviderFormData>({
        name: '',
        displayName: '',
        apiKey: '',
        baseUrl: '',
        config: prettyConfig(),
    });
    const [editForm, setEditForm] = useState<ProviderFormData>({
        name: '',
        displayName: '',
        apiKey: '',
        baseUrl: '',
        config: prettyConfig(),
    });

    const [testPrompt, setTestPrompt] = useState('Hello');
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [createProcessing, setCreateProcessing] = useState(false);
    const [editProcessing, setEditProcessing] = useState(false);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [activatingId, setActivatingId] = useState<string | null>(null);
    const [showCreateApiKey, setShowCreateApiKey] = useState(false);
    const [showEditApiKey, setShowEditApiKey] = useState(false);
    const [savingFallbackOrder, setSavingFallbackOrder] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);
    const [embeddingLoading, setEmbeddingLoading] = useState(false);
    const [embeddingSwitching, setEmbeddingSwitching] = useState<string | null>(null);

    const activeProvider = useMemo(() => providerList.find((provider) => provider.isActive) ?? null, [providerList]);
    const fallbackProviders = useMemo(
        () => [...providerList].sort((a, b) => (a.fallbackOrder ?? Number.MAX_SAFE_INTEGER) - (b.fallbackOrder ?? Number.MAX_SAFE_INTEGER)),
        [providerList],
    );


    const fetchEmbeddingConfig = async () => {
        setEmbeddingLoading(true);
        try {
            const response = await axios.get<EmbeddingConfig | { data: EmbeddingConfig }>('/admin/ai-settings/embedding-config');
            const payload = response.data as EmbeddingConfig | { data: EmbeddingConfig };
            // BFF passes the engine payload through unchanged (no data wrapper).
            setEmbeddingConfig('data' in payload ? payload.data : payload);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal memuat konfigurasi embedding.'));
        } finally {
            setEmbeddingLoading(false);
        }
    };

    const handleSwitchEmbedding = async (provider: 'voyage' | 'local') => {
        setEmbeddingSwitching(provider);
        try {
            await axios.put('/admin/ai-settings/embedding-config', { provider });
            toast.success(provider === 'voyage' ? 'Provider embedding diganti ke Voyage AI.' : 'Provider embedding diganti ke Local (FastEmbed).');
            await fetchEmbeddingConfig();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal mengganti provider embedding.'));
        } finally {
            setEmbeddingSwitching(null);
        }
    };

    useEffect(() => {
        void fetchEmbeddingConfig();
    }, []);

    const syncProviders = () => {
        setIsSyncing(true);
        router.reload({
            only: ['providers'],
            onSuccess: (page) => {
                const nextProviders = (page.props.providers ?? []) as AiProvider[];
                setProviderList(nextProviders);
            },
            onFinish: () => setIsSyncing(false),
        });
    };

    const handleCreateModelSelect = (modelId: string) => {
        setCreateForm((prev) => {
            let config: Record<string, unknown>;
            try {
                config = JSON.parse(prev.config || '{}');
            } catch {
                config = {};
            }
            config.defaultModel = modelId;
            return {
                ...prev,
                config: JSON.stringify(config, null, 2),
            };
        });
        toast.success(`Model ${modelId} dipilih`);
    };

    const handleEditModelSelect = (modelId: string) => {
        setEditForm((prev) => {
            let config: Record<string, unknown>;
            try {
                config = JSON.parse(prev.config || '{}');
            } catch {
                config = {};
            }
            config.defaultModel = modelId;
            return {
                ...prev,
                config: JSON.stringify(config, null, 2),
            };
        });
        toast.success(`Model ${modelId} dipilih`);
    };

    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            displayName: '',
            apiKey: '',
            baseUrl: '',
            config: prettyConfig(),
        });
        setCreateErrors({});
        setShowCreateApiKey(false);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        resetCreateForm();
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setSelectedProvider(null);
        setEditErrors({});
        setShowEditApiKey(false);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setSelectedProvider(null);
    };

    const closeTestModal = () => {
        setShowTestModal(false);
        setSelectedProvider(null);
        setTestPrompt('Hello');
        setTestResult(null);
        setIsTestingConnection(false);
    };

    const openEdit = async (provider: AiProvider) => {
        setOpenActionsFor(null);
        try {
            const response = await axios.get<{ data: AiProvider }>(`/admin/ai-settings/${provider.id}`);
            const detail = response.data.data;

            setSelectedProvider(detail);
            setEditForm({
                name: detail.name,
                displayName: detail.displayName,
                apiKey: '',
                baseUrl: detail.baseUrl ?? '',
                config: prettyConfig(detail.config),
            });
            setEditErrors({});
            setShowEditModal(true);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal memuat detail provider.'));
        }
    };

    const openDelete = (provider: AiProvider) => {
        setOpenActionsFor(null);
        setSelectedProvider(provider);
        setShowDeleteModal(true);
    };

    const openTest = (provider: AiProvider) => {
        setOpenActionsFor(null);
        setSelectedProvider(provider);
        setShowTestModal(true);
        setTestPrompt('Hello');
        setTestResult(null);
    };

    const parseConfig = (rawConfig: string) => {
        if (!rawConfig.trim()) return {};
        return JSON.parse(rawConfig) as Record<string, unknown>;
    };

    const validateProviderForm = (form: ProviderFormData, isEdit = false) => {
        const errors: Record<string, string> = {};

        if (!isEdit && !form.name.trim()) {
            errors.name = 'Nama provider wajib diisi.';
        }

        if (!form.displayName.trim()) {
            errors.displayName = 'Nama tampilan wajib diisi.';
        }

        if (!isEdit && !form.apiKey.trim()) {
            errors.apiKey = 'API key wajib diisi.';
        }

        if (form.apiKey.trim().length > 0 && form.apiKey.trim().length < 10) {
            errors.apiKey = 'API key minimal 10 karakter.';
        }

        if (form.baseUrl.trim()) {
            try {
                new URL(form.baseUrl.trim());
            } catch {
                errors.baseUrl = 'Base URL harus valid.';
            }
        }

        try {
            parseConfig(form.config);
        } catch {
            errors.config = 'Config harus berupa JSON yang valid.';
        }

        return errors;
    };

    const handleCreateProvider = async (event: FormEvent) => {
        event.preventDefault();

        const errors = validateProviderForm(createForm);
        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            return;
        }

        setCreateProcessing(true);
        setCreateErrors({});

        try {
            await axios.post('/admin/ai-settings', {
                name: createForm.name.trim(),
                displayName: createForm.displayName.trim(),
                apiKey: createForm.apiKey.trim(),
                baseUrl: createForm.baseUrl.trim() || undefined,
                config: parseConfig(createForm.config),
            });

            toast.success('AI provider berhasil ditambahkan.');
            closeCreateModal();
            syncProviders();
        } catch (error) {
            setCreateErrors(normalizeErrors(error));
            toast.error(extractErrorMessage(error, 'Gagal menambahkan AI provider.'));
        } finally {
            setCreateProcessing(false);
        }
    };

    const handleUpdateProvider = async (event: FormEvent) => {
        event.preventDefault();

        if (!selectedProvider) return;

        const errors = validateProviderForm(editForm, true);
        if (Object.keys(errors).length > 0) {
            setEditErrors(errors);
            return;
        }

        setEditProcessing(true);
        setEditErrors({});

        try {
            await axios.put(`/admin/ai-settings/${selectedProvider.id}`, {
                displayName: editForm.displayName.trim(),
                apiKey: editForm.apiKey.trim() || undefined,
                baseUrl: editForm.baseUrl.trim() || undefined,
                config: parseConfig(editForm.config),
            });

            toast.success('AI provider berhasil diperbarui.');
            closeEditModal();
            syncProviders();
        } catch (error) {
            setEditErrors(normalizeErrors(error));
            toast.error(extractErrorMessage(error, 'Gagal memperbarui AI provider.'));
        } finally {
            setEditProcessing(false);
        }
    };

    const handleDeleteProvider = async () => {
        if (!selectedProvider) return;

        setDeleteProcessing(true);

        try {
            await axios.delete(`/admin/ai-settings/${selectedProvider.id}`);
            toast.success('AI provider berhasil dihapus.');
            closeDeleteModal();
            syncProviders();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal menghapus AI provider.'));
        } finally {
            setDeleteProcessing(false);
        }
    };

    const handleTestConnection = async () => {
        if (!selectedProvider) return;

        setIsTestingConnection(true);
        setTestResult(null);

        try {
            const response = await axios.post<{ data: TestResult }>(`/admin/ai-settings/${selectedProvider.id}/test`, {
                testPrompt,
            });
            setTestResult(response.data.data);
            toast.success('Uji koneksi berhasil.');
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal melakukan uji koneksi.'));
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleActivateProvider = async (provider: AiProvider) => {
        setActivatingId(provider.id);

        try {
            await axios.post(`/admin/ai-settings/${provider.id}/activate`);
            toast.success(`${provider.displayName} sekarang aktif.`);
            syncProviders();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal mengaktifkan provider.'));
        } finally {
            setActivatingId(null);
        }
    };

    const moveFallbackProvider = async (providerId: string, direction: 'up' | 'down') => {
        const ordered = [...fallbackProviders];
        const index = ordered.findIndex((provider) => provider.id === providerId);

        if (index === -1) {
            return;
        }

        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ordered.length) {
            return;
        }

        [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
        const nextProviderIds = ordered.map((provider) => provider.id);

        setSavingFallbackOrder(true);

        try {
            await axios.put('/admin/ai-settings/fallback-order', {
                providerIds: nextProviderIds,
            });
            toast.success('Fallback order berhasil diperbarui.');
            syncProviders();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Gagal memperbarui fallback order.'));
        } finally {
            setSavingFallbackOrder(false);
        }
    };

    return (
        <AppLayout title="Pengaturan AI">
            <Head title="Admin - Pengaturan AI" />

            <div className="space-y-6">
                <Breadcrumbs items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Pengaturan AI' }]} />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                                    style={{
background: 'var(--dm-accent-bg)',
                                border: '1px solid var(--dm-accent-border-light)',
                                    }}
                                >
                                    <Server className="h-6 w-6" style={{ color: 'var(--dm-accent)' }} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold" style={headingStyle}>
                                        Pengaturan AI
                                    </h1>
                                    <p className="mt-2 max-w-2xl text-brand-muted-dark dark:text-gray-300">
                                        Kelola provider AI untuk kebutuhan admin tanpa mengubah kode. API key tetap disimpan aman,
                                        hanya ditampilkan dalam bentuk tersamarkan, dan satu provider aktif bisa dipilih langsung dari tabel.
                                    </p>
                                </div>
                            </div>

                            <PrimaryButton onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Tambah Provider
                            </PrimaryButton>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                                <p className="text-sm text-brand-muted-dark dark:text-gray-600">Total provider</p>
                                <p className="mt-2 text-2xl font-semibold text-brand-dark dark:text-gray-100">{providerList.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                                <p className="text-sm text-brand-muted-dark dark:text-gray-600">Provider aktif</p>
                                <p className="mt-2 text-lg font-semibold text-brand-dark dark:text-gray-100">
                                    {activeProvider ? activeProvider.displayName : 'Belum ada'}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                                <p className="text-sm text-brand-muted-dark dark:text-gray-600">Keamanan</p>
                                <p className="mt-2 text-sm font-medium text-brand-dark dark:text-gray-100">API key tersimpan terenkripsi dan hanya tampil dalam bentuk tersamarkan.</p>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.4 }}>
                    {isSyncing ? (
                        <SkeletonCard cardCount={providerList.length || 3} />
                    ) : (
                    <LiquidGlassCard intensity="medium" className="overflow-hidden p-0" lightMode={true}>
                        <div className="border-b border-black/5 px-6 py-4 dark:border-white/10">
                            <h2 className="text-lg font-semibold text-brand-dark dark:text-gray-100">Daftar provider</h2>
                            <p className="mt-1 text-sm text-brand-muted-dark dark:text-gray-300">Aktifkan satu provider yang akan dipakai sistem, uji koneksi kapan pun, lalu perbarui konfigurasi lewat modal.</p>
                        </div>

                        {providerList.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Server className="mx-auto h-10 w-10 text-brand-primary/70" />
                                <h3 className="mt-4 text-lg font-semibold text-brand-dark dark:text-gray-100">Belum ada provider</h3>
                                <p className="mt-2 text-sm text-brand-muted-dark dark:text-gray-300">Tambahkan provider pertama untuk mulai mengelola pengaturan AI.</p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/10">
                                        <thead className="bg-white/60 text-left text-brand-muted-dark dark:bg-white/5 dark:text-gray-600">
                                            <tr>
                                                <th className="px-6 py-4 font-medium">Nama</th>
                                                <th className="px-6 py-4 font-medium">Status</th>
                                                <th className="px-6 py-4 font-medium">Base URL</th>
                                                <th className="px-6 py-4 font-medium">API key</th>
                                                <th className="px-6 py-4 font-medium">Diperbarui</th>
                                                <th className="px-6 py-4 text-right font-medium">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 bg-white/30 dark:divide-white/10 dark:bg-white/5">
                                            {providerList.map((provider) => (
                                                <tr key={provider.id} className={provider.isActive ? 'bg-brand-primary/[0.03]' : ''}>
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="flex items-start gap-3">
                                                            <div className="rounded-xl border border-brand-primary/10 bg-brand-primary/5 p-2 text-brand-primary">
                                                                <Server className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-brand-dark dark:text-gray-100">{provider.displayName}</p>
                                                                <p className="text-xs text-brand-muted-dark dark:text-gray-600">{provider.name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                                                                    provider.isActive
                                                                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                                        : 'border-slate-200 bg-slate-100 text-slate-600'
                                                                }`}
                                                            >
                                                                {provider.isActive ? 'Aktif' : 'Nonaktif'}
                                                            </span>
                                                            <ToggleSwitch
                                                                checked={provider.isActive}
                                                                disabled={activatingId === provider.id}
                                                                onChange={() => handleActivateProvider(provider)}
                                                            />
                                                            {activatingId === provider.id && buttonSpinner}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-top text-brand-dark dark:text-gray-200">{provider.baseUrl || '-'}</td>
                                                    <td className="px-6 py-4 align-top font-mono text-xs text-brand-muted-dark dark:text-gray-600">{provider.apiKeyMasked}</td>
                                                    <td className="px-6 py-4 align-top text-brand-muted-dark dark:text-gray-600">{formatDate(provider.updatedAt)}</td>
                                                    <td className="relative px-6 py-4 align-top text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenActionsFor(openActionsFor === provider.id ? null : provider.id)}
                                                            className="rounded-lg p-2 text-brand-muted-dark transition hover:bg-black/5 hover:text-brand-dark dark:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>

                                                        {openActionsFor === provider.id ? (
                                                            <div className="absolute right-6 top-14 z-20 w-48 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl dark:border-white/20 dark:bg-gray-800">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEdit(provider)}
                                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-dark transition hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                                                                >
                                                                    <UserPen className="h-4 w-4" />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openTest(provider)}
                                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-dark transition hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                                                                >
                                                                    <TestTube2 className="h-4 w-4" />
                                                                    Uji koneksi
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleActivateProvider(provider)}
                                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-dark transition hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                                                                >
                                                                    <Power className="h-4 w-4" />
                                                                    Jadikan aktif
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openDelete(provider)}
                                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Hapus
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="block space-y-4 p-4 md:hidden">
                                    {providerList.map((provider) => (
                                        <ProviderCard
                                            key={provider.id}
                                            provider={provider}
                                            activatingId={activatingId}
                                            onToggleActive={handleActivateProvider}
                                            onTest={openTest}
                                            onEdit={(item) => {
                                                void openEdit(item);
                                            }}
                                            onDelete={openDelete}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </LiquidGlassCard>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.4 }}>
                    <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-brand-dark dark:text-gray-100">Embedding</h2>
                                <p className="mt-1 text-sm text-brand-muted-dark dark:text-gray-300">
                                    Provider embedding untuk RAG, grounding, dan deteksi off-topic. Voyage AI berjalan remote; Local (FastEmbed) berjalan on-device sebagai backup.
                                </p>
                            </div>
                            {embeddingLoading ? <Loader2 className="h-5 w-5 animate-spin text-brand-primary" /> : null}
                        </div>

                        {embeddingConfig ? (
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <button
                                    type="button"
                                    disabled={embeddingConfig.provider === 'voyage' || embeddingSwitching !== null || !embeddingConfig.voyageConfigured}
                                    onClick={() => void handleSwitchEmbedding('voyage')}
                                    className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed ${
                                        embeddingConfig.provider === 'voyage'
                                            ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/30'
                                            : 'border-slate-200 bg-white/70 hover:border-brand-primary/40 disabled:opacity-50 dark:border-white/20 dark:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-brand-dark dark:text-gray-100">Voyage AI</p>
                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                                            embeddingConfig.provider === 'voyage'
                                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                : 'border-slate-200 bg-slate-100 text-slate-600'
                                        }`}>
                                            {embeddingConfig.provider === 'voyage' ? 'Aktif' : 'Siaga'}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-brand-muted-dark break-words dark:text-gray-600">
                                        {embeddingConfig.voyageModel || 'voyage-3.5'} • dim {embeddingConfig.voyageOutputDimension ?? 1024}
                                    </p>
                                    {!embeddingConfig.voyageConfigured ? (
                                        <p className="mt-1 text-xs text-amber-600">API key belum dikonfigurasi di server.</p>
                                    ) : null}
                                    {embeddingSwitching === 'voyage' ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-brand-primary" /> : null}
                                </button>

                                <button
                                    type="button"
                                    disabled={embeddingConfig.provider === 'local' || embeddingSwitching !== null}
                                    onClick={() => void handleSwitchEmbedding('local')}
                                    className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed ${
                                        embeddingConfig.provider === 'local'
                                            ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/30'
                                            : 'border-slate-200 bg-white/70 hover:border-brand-primary/40 disabled:opacity-50 dark:border-white/20 dark:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-brand-dark dark:text-gray-100">Local (FastEmbed)</p>
                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                                            embeddingConfig.provider === 'local'
                                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                : 'border-slate-200 bg-slate-100 text-slate-600'
                                        }`}>
                                            {embeddingConfig.provider === 'local' ? 'Aktif' : 'Cadangan'}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-brand-muted-dark break-words dark:text-gray-600">
                                        {embeddingConfig.localModel || 'paraphrase-multilingual-MiniLM-L12-v2'} • on-device
                                    </p>
                                    {embeddingConfig.degraded ? (
                                        <p className="mt-1 text-xs text-amber-600">Voyage tidak tersedia — fallback lokal aktif.</p>
                                    ) : null}
                                    {embeddingSwitching === 'local' ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-brand-primary" /> : null}
                                </button>
                            </div>
                        ) : (
                            <p className="mt-5 text-sm text-brand-muted-dark dark:text-gray-600">
                                {embeddingLoading ? 'Memuat konfigurasi embedding…' : 'Konfigurasi embedding tidak tersedia (AI engine tidak terjangkau).'}
                            </p>
                        )}
                    </LiquidGlassCard>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}>
                    <LiquidGlassCard intensity="medium" className="p-6" lightMode={true}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-brand-dark dark:text-gray-100">Urutan fallback</h2>
                                <p className="mt-1 text-sm text-brand-muted-dark dark:text-gray-300">
                                    Urutan ini menentukan provider cadangan saat provider utama gagal. Pindahkan provider ke atas atau bawah untuk mengatur chain 1st → 2nd → 3rd.
                                </p>
                            </div>
                            {savingFallbackOrder ? <Loader2 className="h-5 w-5 animate-spin text-brand-primary" /> : null}
                        </div>

                        <div className="mt-5 space-y-3">
                            {fallbackProviders.map((provider, index) => (
                                <div key={provider.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-white/20 dark:bg-white/5">
                                    <div>
                                        <p className="font-medium text-brand-dark dark:text-gray-100">{index + 1}. {provider.displayName}</p>
                                        <p className="text-xs text-brand-muted-dark dark:text-gray-600">{provider.name} {provider.isActive ? '• aktif' : '• siaga'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={index === 0 || savingFallbackOrder}
                                            onClick={() => void moveFallbackProvider(provider.id, 'up')}
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Naikkan
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === fallbackProviders.length - 1 || savingFallbackOrder}
                                            onClick={() => void moveFallbackProvider(provider.id, 'down')}
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Turunkan
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </LiquidGlassCard>
                </motion.div>
            </div>

            <FormModal
                open={showCreateModal}
                title="Tambah Provider AI"
                description="Tambahkan provider baru lengkap dengan API key, base URL, dan advanced config JSON."
                onClose={closeCreateModal}
                scrollable
            >
                <form onSubmit={handleCreateProvider} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Nama provider</label>
                            <input
                                value={createForm.name}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                                className={inputClassName}
                                placeholder="openai"
                            />
                            <InputError message={createErrors.name} className="mt-2" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Nama tampilan</label>
                            <input
                                value={createForm.displayName}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, displayName: event.target.value }))}
                                className={inputClassName}
                                placeholder="OpenAI"
                            />
                            <InputError message={createErrors.displayName} className="mt-2" />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-brand-dark dark:text-gray-200">API Key</label>
                        <div className="relative">
                            <input
                                type={showCreateApiKey ? 'text' : 'password'}
                                value={createForm.apiKey}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, apiKey: event.target.value }))}
                                className={`${inputClassName} pr-12`}
                                placeholder="sk-..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowCreateApiKey((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted-dark dark:text-gray-600"
                            >
                                {showCreateApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <InputError message={createErrors.apiKey} className="mt-2" />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Base URL</label>
                        <input
                            value={createForm.baseUrl}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                            className={inputClassName}
                            placeholder="https://api.openai.com/v1"
                        />
                        <InputError message={createErrors.baseUrl} className="mt-2" />
                    </div>

                    {createForm.name && (
                        <ModelFetcher
                            providerName={createForm.name}
                            onModelSelect={handleCreateModelSelect}
                        />
                    )}

                    <div>
                        <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Config (JSON)</label>
                        <textarea
                            value={createForm.config}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, config: event.target.value }))}
                            className={`${inputClassName} min-h-52 font-mono text-xs`}
                        />
                        <InputError message={createErrors.config} className="mt-2" />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <SecondaryButton onClick={closeCreateModal}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={createProcessing} className="inline-flex items-center gap-2">
                            {createProcessing ? buttonSpinner : <Plus className="h-4 w-4" />}
                            Simpan provider
                        </PrimaryButton>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={showEditModal}
                title="Ubah Provider AI"
                description="Perbarui display name, API key, base URL, atau advanced config untuk provider ini."
                onClose={closeEditModal}
                scrollable
            >
                <form onSubmit={handleUpdateProvider} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Nama provider</label>
                            <input value={editForm.name} disabled className={`${inputClassName} cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-500`} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Nama tampilan</label>
                            <input
                                value={editForm.displayName}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, displayName: event.target.value }))}
                                className={inputClassName}
                            />
                            <InputError message={editErrors.displayName} className="mt-2" />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-brand-dark dark:text-gray-200">API key baru</label>
                        <div className="relative">
                            <input
                                type={showEditApiKey ? 'text' : 'password'}
                                value={editForm.apiKey}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, apiKey: event.target.value }))}
                                className={`${inputClassName} pr-12`}
                                placeholder={selectedProvider?.apiKeyMasked ?? 'Kosongkan jika tidak diubah'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowEditApiKey((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted-dark dark:text-gray-600"
                            >
                                {showEditApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-brand-muted-dark dark:text-gray-600">API key saat ini: {selectedProvider?.apiKeyMasked ?? '-'}</p>
                        <InputError message={editErrors.apiKey} className="mt-2" />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Base URL</label>
                        <input
                            value={editForm.baseUrl}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                            className={inputClassName}
                            placeholder="https://api.openai.com/v1"
                        />
                        <InputError message={editErrors.baseUrl} className="mt-2" />
                    </div>

                    {editForm.name && (
                        <ModelFetcher
                            providerName={editForm.name}
                            onModelSelect={handleEditModelSelect}
                        />
                    )}

                    <div>
                        <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Config (JSON)</label>
                        <textarea
                            value={editForm.config}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, config: event.target.value }))}
                            className={`${inputClassName} min-h-52 font-mono text-xs`}
                        />
                        <InputError message={editErrors.config} className="mt-2" />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                        <SecondaryButton onClick={() => selectedProvider && openTest(selectedProvider)} className="inline-flex items-center gap-2">
                            <TestTube2 className="h-4 w-4" />
                            Uji koneksi
                        </SecondaryButton>

                        <div className="flex items-center gap-3">
                            <SecondaryButton onClick={closeEditModal}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={editProcessing} className="inline-flex items-center gap-2">
                                {editProcessing ? buttonSpinner : <CheckCircle2 className="h-4 w-4" />}
                                Simpan perubahan
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={showDeleteModal}
                title="Hapus Provider AI"
                description="Provider yang dihapus tidak bisa dikembalikan. Pastikan provider ini memang tidak lagi dipakai."
                onClose={closeDeleteModal}
                maxWidth="max-w-lg"
                scrollable
            >
                <div className="space-y-5">
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
                        Anda akan menghapus <strong>{selectedProvider?.displayName}</strong>.
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <SecondaryButton onClick={closeDeleteModal}>
                            Batal
                        </SecondaryButton>
                        <button
                            type="button"
                            onClick={handleDeleteProvider}
                            disabled={deleteProcessing}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {deleteProcessing ? buttonSpinner : <Trash2 className="h-4 w-4" />}
                            Hapus provider
                        </button>
                    </div>
                </div>
            </FormModal>

            <FormModal
                open={showTestModal}
                title="Uji koneksi"
                description="Jalankan uji koneksi langsung ke provider yang dipilih untuk memastikan API key, model, dan konfigurasi fallback siap dipakai."
                onClose={closeTestModal}
                maxWidth="max-w-xl"
                scrollable
            >
                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-brand-dark dark:border-white/20 dark:bg-white/5 dark:text-gray-200">
                        Provider: <strong>{selectedProvider?.displayName}</strong>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-brand-dark dark:text-gray-200">Prompt uji</label>
                        <textarea
                            value={testPrompt}
                            onChange={(event) => setTestPrompt(event.target.value)}
                            className={`${inputClassName} min-h-28`}
                            placeholder="Katakan halo"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <SecondaryButton onClick={closeTestModal}>
                            Tutup
                        </SecondaryButton>
                        <PrimaryButton onClick={handleTestConnection} disabled={isTestingConnection} className="inline-flex items-center gap-2">
                            {isTestingConnection ? buttonSpinner : <TestTube2 className="h-4 w-4" />}
                            Jalankan uji koneksi
                        </PrimaryButton>
                    </div>

                    {testResult ? (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-5 w-5" />
                                <p className="font-semibold">Uji berhasil</p>
                            </div>
                            <div className="mt-3 space-y-2 text-sm text-brand-dark dark:text-gray-200">
                                <p>
                                    <strong>Status:</strong> {testResult.status}
                                </p>
                                <p>
                                    <strong>Model:</strong> {testResult.model}
                                </p>
                                <p>
                                    <strong>Latensi:</strong> {testResult.latency} ms
                                </p>
                                <div>
                                    <strong>Respons:</strong>
                                    <div className="mt-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-brand-dark dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-gray-200">
                                        {testResult.response}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </FormModal>
        </AppLayout>
    );
}
