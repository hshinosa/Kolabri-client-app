import axios from 'axios';
import type { ModelListResponse } from '@/types/admin-provider';

// P2-05 (pass2): testProviderConnection() lama memanggil /admin/ai-providers/test
// yang tidak pernah ada di routes/web.php (404) dan tak pernah dipakai —
// uji koneksi yang sebenarnya ada di AI Settings → POST /admin/ai-settings/{id}/test.

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
