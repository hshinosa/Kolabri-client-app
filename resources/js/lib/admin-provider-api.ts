import axios from 'axios';
import type { TestProviderRequest, TestProviderResponse, ModelListResponse } from '@/types/admin-provider';

export async function testProviderConnection(request: TestProviderRequest): Promise<TestProviderResponse> {
    const response = await axios.post<{ data: TestProviderResponse }>('/admin/ai-providers/test', request);
    return response.data.data;
}

export async function getProviderModels(
    provider: string,
    refresh = false
): Promise<ModelListResponse> {
    const response = await axios.get<{ data: ModelListResponse }>(
        `/admin/ai-settings/${provider}/models`,
        { params: { refresh } }
    );
    return response.data.data;
}
