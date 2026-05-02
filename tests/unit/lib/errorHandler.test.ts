import { describe, expect, it, vi } from 'vitest';

const { isAxiosError } = vi.hoisted(() => ({
    isAxiosError: vi.fn(),
}));

vi.mock('axios', () => ({
    default: {
        isAxiosError,
    },
}));

import { getErrorMessage } from '@/lib/errorHandler';

describe('getErrorMessage', () => {
    it('returns the generic fallback for non-axios errors', () => {
        isAxiosError.mockReturnValue(false);

        expect(getErrorMessage(new Error('boom'))).toBe('Terjadi kesalahan tidak terduga.');
    });

    it('maps 401 errors to the session-expired message', () => {
        isAxiosError.mockReturnValue(true);

        expect(getErrorMessage({ response: { status: 401 } })).toBe('Sesi Anda telah berakhir. Silakan login kembali.');
    });

    it('maps 403 errors to the forbidden message', () => {
        isAxiosError.mockReturnValue(true);

        expect(getErrorMessage({ response: { status: 403 } })).toBe('Anda tidak memiliki akses untuk melakukan ini.');
    });

    it('maps 429 errors to the rate-limit message', () => {
        isAxiosError.mockReturnValue(true);

        expect(getErrorMessage({ response: { status: 429 } })).toBe('Terlalu banyak permintaan. Tunggu sebentar.');
    });

    it('maps 500 errors to the server-error message', () => {
        isAxiosError.mockReturnValue(true);

        expect(getErrorMessage({ response: { status: 500 } })).toBe('Server error. Tim kami sedang memperbaiki.');
    });

    it('maps timeout errors by code', () => {
        isAxiosError.mockReturnValue(true);

        expect(getErrorMessage({ code: 'ECONNABORTED' })).toBe('Koneksi timeout. Periksa internet Anda.');
    });

    it('maps network errors by code', () => {
        isAxiosError.mockReturnValue(true);

        expect(getErrorMessage({ code: 'ERR_NETWORK' })).toBe('Tidak ada koneksi internet.');
    });

    it('uses the API message when available', () => {
        isAxiosError.mockReturnValue(true);

        expect(getErrorMessage({ response: { data: { message: 'Custom API error' } } })).toBe('Custom API error');
    });

    it('falls back to the generic axios message when no special case matches', () => {
        isAxiosError.mockReturnValue(true);

        expect(getErrorMessage({ response: { status: 418 } })).toBe('Terjadi kesalahan. Coba lagi.');
    });
});
