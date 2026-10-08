<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Uji spesifikasi batas rate limit BFF (Spesifikasi-Batas-RateLimit-Kolabri §3):
 *   - close-session : 10/jam per user, limiter TERPISAH (dulu berbagi 10/5m
 *                     dgn reflection & regenerate — terbukti menimbulkan 429
 *                     yang tidak semestinya)
 *   - flag per-limiter RL_CLOSE_SESSION_DISABLED mematikan SATU limiter saja
 *     (non-global): reflection tetap membatasi.
 */
class RateLimitThrottleTest extends TestCase
{
    private function authenticatedSession(): self
    {
        return $this->withSession([
            'jwt' => $this->createFakeJwt(['sub' => 'user-1']),
            'user' => [
                'id' => 'user-1',
                'name' => 'Test User',
                'email' => 'test@example.com',
                'role' => 'student',
            ],
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    protected function tearDown(): void
    {
        putenv('RL_CLOSE_SESSION_DISABLED');
        unset($_ENV['RL_CLOSE_SESSION_DISABLED'], $_SERVER['RL_CLOSE_SESSION_DISABLED']);
        parent::tearDown();
    }

    private function fakeCoreApi(): void
    {
        Http::fake([
            'http://localhost:3000/*' => Http::response(['data' => []], 200),
        ]);
    }

    public function test_close_session_throttles_after_10_requests_per_hour(): void
    {
        $this->fakeCoreApi();

        $url = route('student.session-discussions.close', [
            'course' => 'course-1',
            'sessionDiscussion' => 'session-1',
        ]);

        // 10 pertama TIDAK kena429 (batas baru close-session = 10/jam per user).
        // Data uji dummy sehingga controller membalas404 — throttle tetap dihitung
        // sebelum controller, jadi yang divalidasi di sini: bukan429.
        for ($i = 0; $i < 10; $i++) {
            $status = $this->authenticatedSession()->post($url)->getStatusCode();
            $this->assertNotSame(429, $status, "percobaan ke-{$i} seharusnya belum dibatasi");
        }

        // percobaan ke-11 kena429
        $this->authenticatedSession()
            ->post($url)
            ->assertStatus(429);
    }

    public function test_close_session_flag_disables_only_close_session_not_reflection(): void
    {
        $this->fakeCoreApi();

        // Saklar per-limiter: close-session dimatikan...
        putenv('RL_CLOSE_SESSION_DISABLED=1');
        $_ENV['RL_CLOSE_SESSION_DISABLED'] = '1';
        $_SERVER['RL_CLOSE_SESSION_DISABLED'] = '1';

        $closeUrl = route('student.session-discussions.close', [
            'course' => 'course-1',
            'sessionDiscussion' => 'session-1',
        ]);

        for ($i = 0; $i < 15; $i++) {
            $status = $this->authenticatedSession()->post($closeUrl)->getStatusCode();
            $this->assertNotSame(429, $status, "close-session seharusnya tidak membatasi (flag aktif) pada request ke-{$i}");
        }

        // ...namun limiter reflection TETAP hidup (bukti non-global)
        Cache::flush();
        $reflectionUrl = route('student.session-discussions.reflection', [
            'course' => 'course-1',
            'sessionDiscussion' => 'session-1',
        ]);

        for ($i = 0; $i < 10; $i++) {
            $status = $this->authenticatedSession()->post($reflectionUrl)->getStatusCode();
            $this->assertNotSame(429, $status, "reflection seharusnya belum kena pada request ke-{$i}");
        }

        $this->authenticatedSession()
            ->post($reflectionUrl)
            ->assertStatus(429);
    }
}
