<?php

namespace App\Http\Controllers\Lecturer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class LecturerSessionInsightController extends Controller
{
    /**
     * GET /lecturer/courses/{course}/sessions
     * Daftar sesi diskusi untuk dosen pemilik kelas.
     * Proxy ke Core API GET /api/courses/{course}/sessions (owner-check di core-api).
     */
    public function index(string $course): JsonResponse
    {
        try {
            $response = $this->apiRequest()->get(
                $this->apiUrl() . "/api/courses/{$course}/sessions"
            );

            return $this->proxyResponse($response);
        } catch (ConnectionException | RequestException $e) {
            Log::error('LecturerSessionInsight: gagal memuat daftar sesi', [
                'course' => $course,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Gagal memuat daftar sesi diskusi'], 502);
        }
    }

    /**
     * GET /lecturer/courses/{course}/sessions/{sessionDiscussion}/detail
     * Hasil analisis per sesi (quality score, rekomendasi, metrik, timeline)
     * + ringkasan AI — dua panggilan core-api digabung jadi satu payload.
     */
    public function detail(string $course, string $sessionDiscussion): JsonResponse
    {
        try {
            $analytics = $this->apiRequest(20)->get(
                $this->apiUrl() . "/api/analytics/session-discussion/{$sessionDiscussion}"
            );

            if ($analytics->failed()) {
                return response()->json(
                    $analytics->json() ?? ['message' => 'Analisis sesi gagal dimuat'],
                    $analytics->status()
                );
            }

            $summaryResponse = $this->apiRequest(20)->get(
                $this->apiUrl() . "/api/session-discussions/{$sessionDiscussion}/summary"
            );

            $summaryPayload = $summaryResponse->successful() ? $summaryResponse->json() : [];

            return response()->json([
                'analytics' => $analytics->json(),
                'summary' => $summaryPayload['summary'] ?? null,
                'summary_generated_at' => $summaryPayload['generatedAt'] ?? null,
            ]);
        } catch (ConnectionException | RequestException $e) {
            Log::error('LecturerSessionInsight: gagal memuat detail sesi', [
                'course' => $course,
                'session_discussion' => $sessionDiscussion,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Gagal memuat analisis sesi'], 502);
        }
    }
}
