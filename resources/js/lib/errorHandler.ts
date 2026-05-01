import axios from 'axios';

export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) return 'Sesi Anda telah berakhir. Silakan login kembali.';
        if (error.response?.status === 403) return 'Anda tidak memiliki akses untuk melakukan ini.';
        if (error.response?.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar.';
        if (error.response?.status === 500) return 'Server error. Tim kami sedang memperbaiki.';
        if (error.code === 'ECONNABORTED') return 'Koneksi timeout. Periksa internet Anda.';
        if (error.code === 'ERR_NETWORK') return 'Tidak ada koneksi internet.';
        return error.response?.data?.message || 'Terjadi kesalahan. Coba lagi.';
    }
    return 'Terjadi kesalahan tidak terduga.';
}
