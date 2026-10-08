<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Force all URL generation to use APP_URL (critical for Docker port mapping)
        URL::forceRootUrl((string) config('app.url'));

        // Ensure scheme matches APP_URL (https://... or http://...)
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        } else {
            URL::forceScheme('http');
        }

        Http::globalOptions([
            'curl' => [
                CURLOPT_TCP_KEEPALIVE => 1,
                CURLOPT_TCP_KEEPIDLE => 120,
                CURLOPT_TCP_KEEPINTVL => 60,
            ],
        ]);
        // ---------------------------------------------------------------------------
        // Rate limit per-endpoint (rancangan Spesifikasi-Batas-RateLimit-Kolabri).
        // Otoritas utama auth = core-api (route login/register BFF tanpa throttle).
        // Saklar: RATE_LIMIT_DISABLED (global darurat) atau RL_<NAMA>_DISABLED
        // (matikan SATU limiter). Semua HIDUP by default.
        // ---------------------------------------------------------------------------
        $rlDisabled = function (string $name): bool {
            if (filter_var(env('RATE_LIMIT_DISABLED', false), FILTER_VALIDATE_BOOLEAN)) {
                return true;
            }

            return filter_var(env('RL_' . strtoupper($name) . '_DISABLED', false), FILTER_VALIDATE_BOOLEAN);
        };

        // Key per-user (bukan per-IP) — banyak mahasiswa berbagi satu IP kampus/NAT.
        $userIdOrIp = function (Request $request): string {
            $user = $request->user();

            return ($user ? (string) $user->getAuthIdentifier() : '') !== ''
                ? 'user:' . $user->getAuthIdentifier()
                : 'ip:' . $request->ip();
        };

        // Forgot-password: IP asli 10/jam (email utk inti reset di core-api).
        RateLimiter::for('forgot-password', function (Request $request) use ($rlDisabled) {
            if ($rlDisabled('FORGOT')) {
                return Limit::none();
            }

            return Limit::perHour((int) env('BFF_FORGOT_RATE_IP_MAX', 10))->by('ip:' . $request->ip());
        });

        // Tutup sesi: 1x per sesi — 10/jam per user.
        RateLimiter::for('close-session', function (Request $request) use ($rlDisabled, $userIdOrIp) {
            if ($rlDisabled('CLOSE_SESSION')) {
                return Limit::none();
            }

            return Limit::perHour((int) env('BFF_CLOSE_RATE_MAX', 10))->by('close:' . $userIdOrIp($request));
        });

        // Refleksi: 10/jam per user.
        RateLimiter::for('reflection', function (Request $request) use ($rlDisabled, $userIdOrIp) {
            if ($rlDisabled('REFLECTION')) {
                return Limit::none();
            }

            return Limit::perHour((int) env('BFF_REFLECTION_RATE_MAX', 10))->by('reflection:' . $userIdOrIp($request));
        });

        // Regenerate ringkasan — berat (panggil AI): 5/jam per user.
        RateLimiter::for('regenerate-summary', function (Request $request) use ($rlDisabled, $userIdOrIp) {
            if ($rlDisabled('REGENERATE')) {
                return Limit::none();
            }

            return Limit::perHour((int) env('BFF_REGENERATE_RATE_MAX', 5))->by('regen:' . $userIdOrIp($request));
        });

        // Upload chat (gambar/file): 30/5 menit per user.
        RateLimiter::for('chat-upload', function (Request $request) use ($rlDisabled, $userIdOrIp) {
            if ($rlDisabled('CHAT_UPLOAD')) {
                return Limit::none();
            }

            return Limit::perMinutes(5, (int) env('BFF_UPLOAD_RATE_MAX', 30))->by('upload:' . $userIdOrIp($request));
        });

        // Aksi bulk admin: 10/menit per user.
        RateLimiter::for('admin-bulk', function (Request $request) use ($rlDisabled, $userIdOrIp) {
            if ($rlDisabled('ADMIN_BULK')) {
                return Limit::none();
            }

            return Limit::perMinute((int) env('BFF_ADMIN_BULK_RATE_MAX', 10))->by('bulk:' . $userIdOrIp($request));
        });

        // Master-data CRUD admin: 30/menit (input data berturut dibolehkan).
        RateLimiter::for('master-data', function (Request $request) use ($rlDisabled, $userIdOrIp) {
            if ($rlDisabled('MASTER_DATA')) {
                return Limit::none();
            }

            return Limit::perMinute((int) env('BFF_MASTER_DATA_RATE_MAX', 30))->by('master:' . $userIdOrIp($request));
        });

        // Kirim ulang email verifikasi: 3/jam — tiap hit = 1 email keluar.
        RateLimiter::for('email-resend', function (Request $request) use ($rlDisabled, $userIdOrIp) {
            if ($rlDisabled('RESEND')) {
                return Limit::none();
            }

            return Limit::perHour((int) env('BFF_RESEND_RATE_MAX', 3))->by('resend:' . $userIdOrIp($request));
        });
    }
}
