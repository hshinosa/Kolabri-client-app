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
        // Matikan sementara (env RATE_LIMIT_DISABLED=1): semua limiter auth
        // dilewati tanpa membatasi — selaras dengan core-api yang memakai env sama.
        $rateLimitDisabled = filter_var(env('RATE_LIMIT_DISABLED', false), FILTER_VALIDATE_BOOLEAN);

        RateLimiter::for('login', function (Request $request) use ($rateLimitDisabled) {
            if ($rateLimitDisabled) {
                return Limit::none();
            }

            return [
                Limit::perMinutes(5, 5)->by($request->ip()),
                Limit::perHour(10)->by('login:' . $request->input('email')),
            ];
        });

        RateLimiter::for('register', function (Request $request) use ($rateLimitDisabled) {
            if ($rateLimitDisabled) {
                return Limit::none();
            }

            return [
                Limit::perHour(5)->by($request->ip()),
                Limit::perDay(3)->by('register:' . $request->input('email')),
            ];
        });

        RateLimiter::for('forgot-password', function (Request $request) use ($rateLimitDisabled) {
            if ($rateLimitDisabled) {
                return Limit::none();
            }

            return [
                Limit::perHour(5)->by($request->ip()),
                Limit::perHour(3)->by('forgot:' . $request->input('email')),
            ];
        });
    }
}
