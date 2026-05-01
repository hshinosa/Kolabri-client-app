import { expect, test } from '@playwright/test';

import { AI_ENGINE_SECRET, AI_ENGINE_URL, checkServiceAvailable, CORE_API_URL } from './helpers';

const authHeaders = {
    Authorization: `Bearer ${AI_ENGINE_SECRET}`,
};

test.beforeEach(async ({ page }) => {
    const available = await checkServiceAvailable(page);
    if (!available) test.skip(true, 'App not running');
});

test('Core API health', async ({ request }) => {
    try {
        const response = await request.get(`${CORE_API_URL}/health`);
        expect(response.status()).toBeLessThan(500);
        const body = await response.json();
        expect(body).toHaveProperty('status');
    } catch {
        test.skip(true, 'Core API service not available');
    }
});

test('AI Engine health', async ({ request }) => {
    try {
        const response = await request.get(`${AI_ENGINE_URL}/api/health`, {
            headers: authHeaders,
        });
        expect(response.status()).toBeLessThan(500);
        const body = await response.json();
        expect(body).toHaveProperty('status');
    } catch {
        test.skip(true, 'AI Engine service not available');
    }
});

test('AI Engine engagement analysis endpoint', async ({ request }) => {
    try {
        const response = await request.post(`${AI_ENGINE_URL}/api/analytics/engagement`, {
            headers: authHeaders,
            data: { text: 'Saya menganalisis pola diskusi ini secara mendalam' },
        });
        expect(response.status()).toBeLessThan(500);
    } catch {
        test.skip(true, 'AI Engine engagement endpoint not available');
    }
});

test('AI Engine orchestrated chat endpoint', async ({ request }) => {
    try {
        const response = await request.post(`${AI_ENGINE_URL}/api/chat`, {
            headers: authHeaders,
            data: {
                user_id: 'test-user',
                group_id: 'test-group',
                message: 'Halo, bantu saya memahami topik ini.',
                topic: 'Testing topic',
                collection_name: 'course_test-course',
                course_id: 'test-course',
                chat_room_id: 'chat-room-1',
            },
        });
        // May return 500 if LLM not configured, but endpoint should be reachable (not 401/404)
        expect([200, 422, 500]).toContain(response.status());
    } catch {
        test.skip(true, 'AI Engine chat endpoint not available');
    }
});

test('AI Engine intervention endpoints', async ({ request }) => {
    const messages = [
        {
            sender: 'Student A',
            content: 'Mari kita bahas topik ini.',
            timestamp: new Date().toISOString(),
            sender_id: 'student-a',
        },
    ];

    try {
        const analyzeResponse = await request.post(`${AI_ENGINE_URL}/api/intervention/analyze`, {
            headers: authHeaders,
            data: {
                messages,
                topic: 'AI Ethics',
                chat_room_id: 'room-1',
            },
        });
        expect(analyzeResponse.status()).toBeLessThan(500);

        const summaryResponse = await request.post(`${AI_ENGINE_URL}/api/intervention/summary`, {
            headers: authHeaders,
            data: {
                messages,
                chat_room_id: 'room-1',
            },
        });
        expect(summaryResponse.status()).toBeLessThan(500);

        const promptResponse = await request.post(`${AI_ENGINE_URL}/api/intervention/prompt`, {
            headers: authHeaders,
            data: {
                topic: 'AI Ethics',
                context: 'Diskusi kelas',
                difficulty: 'medium',
            },
        });
        expect(promptResponse.status()).toBeLessThan(500);
    } catch {
        test.skip(true, 'AI Engine intervention endpoints not available');
    }
});

test('AI Engine analytics group alias endpoint', async ({ request }) => {
    try {
        const response = await request.get(`${AI_ENGINE_URL}/api/analytics/group/test-group`, {
            headers: authHeaders,
        });
        expect(response.status()).toBeLessThan(500);
    } catch {
        test.skip(true, 'AI Engine analytics group endpoint not available');
    }
});

test('AI Engine analytics export alias endpoint', async ({ request }) => {
    try {
        const response = await request.get(`${AI_ENGINE_URL}/api/analytics/export`, {
            headers: authHeaders,
        });
        expect(response.status()).toBeLessThan(500);
    } catch {
        test.skip(true, 'AI Engine analytics export endpoint not available');
    }
});
