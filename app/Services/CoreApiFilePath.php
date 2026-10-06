<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

/**
 * Resolusi path file materi untuk core-api.
 *
 * core-api membaca file dari shared volume (/shared-storage[-private]) atau
 * path lokalnya sendiri — BUKAN path container Laravel. Mengirim
 * Storage::disk()->path() apa adanya membuat core-api gagal "file not found"
 * sehingga re-ingest metadata minggu tidak pernah terjadi (bug assign minggu,
 * ditemukan E2E 2026-10-06).
 */
class CoreApiFilePath
{
    public static function resolve(string $relativePath, ?string $disk = null): string
    {
        $relativePath = ltrim($relativePath, '/');

        if ($disk === null) {
            $disk = Storage::disk('private')->exists($relativePath) ? 'private'
                : (Storage::disk('public')->exists($relativePath) ? 'public' : 'private');
        }

        if ($disk === 'private' && is_dir('/shared-storage-private')) {
            return '/shared-storage-private/' . $relativePath;
        }

        if ($disk === 'public' && is_dir('/shared-storage')) {
            return '/shared-storage/' . $relativePath;
        }

        return Storage::disk($disk)->path($relativePath);
    }
}
