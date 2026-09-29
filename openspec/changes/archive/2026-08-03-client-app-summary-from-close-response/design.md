# Design

## Current Broken Flow

```
User closes session
  ├── Frontend POST /chat-spaces/{id}/close
  │     ├── Laravel proxies to Core /api/chat-spaces/{id}/close
  │     ├── Core generates summary, returns { id, name, closedAt, closedBy, summary }
  │     ├── Laravel returns response.json() — summary INCLUDED
  │     └── Frontend handleCloseSession discards response (only checks .ok)
  │
  └── Socket session_closed event fires (no summary)
        └── Frontend setSessionClosed(true)
              └── useChatSummary({ enabled: true, ... }) fires
                    └── GET /chat-spaces/{id}/summary
                          ├── Laravel forwards to Core /api/chatspaces/{id}/summary
                          ├── Core returns 404 (endpoint doesn't exist)
                          ├── Laravel converts 404 → 200 with { summary: null }
                          └── Frontend shows empty state
```

## Fixed Flow

```
User closes session
  ├── Frontend POST /chat-spaces/{id}/close
  │     ├── Laravel proxies, returns { id, name, closedAt, summary }
  │     └── Frontend handleCloseSession captures summary, calls setInitialSummary(summary)
  │
  └── ChatSummaryCard renders with state.summary IF initialSummary provided
        └── No fetch needed (skip GET endpoint)
```

## Implementation

### Frontend hook

```typescript
// use-chat-summary.ts
export interface UseChatSummaryOptions {
    courseId: string | undefined;
    chatSpaceId: string | undefined;
    enabled: boolean;
    initialSummary?: ChatDiscussionSummary | null;
}

export function useChatSummary({
    courseId, chatSpaceId, enabled, initialSummary,
}: UseChatSummaryOptions) {
    const [state, setState] = useState<ChatSummaryState>(() => {
        if (initialSummary) return { status: 'ready', summary: initialSummary };
        return { status: 'loading' };
    });
    
    useEffect(() => {
        if (initialSummary) {
            setState({ status: 'ready', summary: initialSummary });
            return;
        }
        // ... existing fetch fallback
    }, [initialSummary, ...]);
    
    return { state };
}
```

### Frontend room.tsx

```typescript
const [initialSummary, setInitialSummary] = useState<ChatDiscussionSummary | null>(null);

const handleCloseSession = useCallback(async () => {
    const response = await fetch(`/student/courses/${course.id}/chat-spaces/${chatSpace.id}/close`, {...});
    if (response.ok) {
        const data = await response.json();
        if (data?.data?.summary) {
            setInitialSummary({
                roomId: chatSpace.id,
                headline: data.data.summary.split('\n')[0] || 'Ringkasan diskusi',
                keyPoints: [],
                detailedSummary: data.data.summary,
                generatedAt: new Date().toISOString(),
            });
        }
    }
}, [...]);

const { state: summaryState } = useChatSummary({
    courseId: course.id,
    chatSpaceId: chatSpace.id,
    enabled: sessionClosed,
    initialSummary,
});
```

### Type Adapter

Core returns plain string, frontend expects `ChatDiscussionSummary` shape (from dev-rizky). Adapter converts.

### Backend pass-through

`StudentCourseController::closeSession` already proxies — just confirm summary field passes through unchanged.
