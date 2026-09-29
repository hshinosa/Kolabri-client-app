# Design

## Component API (already exists)

```typescript
// resources/js/features/chat/summary/types.ts
export type ChatSummaryState =
    | { status: 'loading' }
    | { status: 'empty' }
    | { status: 'error'; message: string }
    | { status: 'ready'; summary: ChatSummary };

export interface ChatSummary {
    headline: string;
    keyPoints: string[];
    decisions?: string[];
    generatedAt: string;
}
```

```typescript
// chat-summary-card.tsx props
interface ChatSummaryCardProps {
    state: ChatSummaryState;
    onOpenDetail?: () => void;
}
```

## Fetch Hook (NEW)

```typescript
// resources/js/features/chat/summary/use-chat-summary.ts
import { useState, useEffect } from 'react';
import type { ChatSummary, ChatSummaryState } from './types';

export function useChatSummary(chatSpaceId: string | undefined, enabled: boolean): { state: ChatSummaryState } {
    const [state, setState] = useState<ChatSummaryState>({ status: 'loading' });

    useEffect(() => {
        if (!enabled || !chatSpaceId) {
            setState({ status: 'empty' });
            return;
        }

        let cancelled = false;
        setState({ status: 'loading' });

        fetch(route('chat.summary', { chatSpace: chatSpaceId }), {
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
        })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data: { summary: ChatSummary | null }) => {
                if (cancelled) return;
                if (!data.summary) {
                    setState({ status: 'empty' });
                } else {
                    setState({ status: 'ready', summary: data.summary });
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setState({ status: 'error', message: err.message || 'Failed to load summary' });
            });

        return () => { cancelled = true; };
    }, [chatSpaceId, enabled]);

    return { state };
}
```

## Integration in chat/room.tsx

```typescript
import { ChatSummaryCard } from '@/features/chat/summary/chat-summary-card';
import { useChatSummary } from '@/features/chat/summary/use-chat-summary';

// inside component
const { state: summaryState } = useChatSummary(chatSpace?.id, sessionClosed);

// in render, when sessionClosed:
{sessionClosed && (
    <div className="...">
        <ChatSummaryCard
            state={summaryState}
            onOpenDetail={() => setShowSummaryDetail(true)}
        />
        {/* existing closed-state content */}
    </div>
)}
```

## Laravel Proxy Route

```php
// routes/web.php (in auth.jwt group)
Route::get('/api/chatspaces/{chatSpace}/summary', [ChatSpaceController::class, 'summary'])
    ->name('chat.summary');

// app/Http/Controllers/ChatSpaceController.php
public function summary(string $chatSpace)
{
    $response = $this->apiRequest()->get("/api/chatspaces/{$chatSpace}/summary");
    if ($response->failed()) {
        return response()->json(['error' => 'Failed to load summary'], $response->status());
    }
    return $response->json();
}
```

## Alternative: Defer (DELETE Components)

If KOL-44 Task 3+ not in current sprint:
- Delete `resources/js/features/chat/summary/*` (4 files)
- Communicate to dev-rizky that scaffold is being removed pending integration plan

Recommendation: **Integrate now** since infrastructure is mostly there (component + tests + types).

## Test Strategy

```typescript
// use-chat-summary.test.ts (new)
test('returns loading initially when enabled', async () => {...});
test('returns empty when chatSpaceId is undefined', async () => {...});
test('fetches and returns ready state on success', async () => {...});
test('returns error state on fetch failure', async () => {...});
test('respects enabled flag — does not fetch when false', async () => {...});

// chat/room.test.tsx (extend if exists, or e2e)
test('renders ChatSummaryCard when sessionClosed', async () => {...});
```
