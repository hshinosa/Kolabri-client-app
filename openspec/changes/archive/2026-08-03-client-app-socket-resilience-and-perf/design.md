# Design

## Socket Re-Auth on Token Expiry

```typescript
// resources/js/hooks/useSocketRoom.ts
useEffect(() => {
    if (!socket) return;

    const handleConnectError = async (err: Error) => {
        if (err.message.includes('unauthorized') || err.message.includes('expired')) {
            try {
                clearTokenCache(); // force refresh
                const newToken = await getSocketAuthToken();
                socket.auth = { token: newToken };
                socket.connect();
            } catch (e) {
                onError?.('reauth_failed');
            }
        }
    };
    socket.on('connect_error', handleConnectError);
    return () => socket.off('connect_error', handleConnectError);
}, [socket, onError]);
```

## Timer Cleanup

```typescript
// resources/js/hooks/useSocketRoom.ts
const qualityTimerRef = useRef<NodeJS.Timeout | null>(null);

socket.on('quality_update', (data) => {
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    qualityTimerRef.current = setTimeout(() => {
        setQualityFeedback(null);
        qualityTimerRef.current = null;
    }, 5000);
});

useEffect(() => {
    return () => {
        if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    };
}, []);
```

## Stable Callback Props

```typescript
// resources/js/hooks/useSocketRoom.ts
const onNewMessageRef = useRef(onNewMessage);
onNewMessageRef.current = onNewMessage;

useEffect(() => {
    socket.on('new_message', (msg) => onNewMessageRef.current(msg));
    return () => socket.off('new_message');
}, [socket]); // stable deps
```

## Surface Service Errors

```php
// app/Http/Controllers/CourseController.php (BEFORE)
try {
    $response = $this->apiRequest()->get('/api/courses');
    return Inertia::render('courses/index', ['courses' => $response->json('data', [])]);
} catch (\Exception $e) {
    return Inertia::render('courses/index', ['courses' => []]); // ❌ silent
}

// AFTER
try {
    $response = $this->apiRequest()->get('/api/courses');
    if ($response->failed()) {
        return Inertia::render('courses/index', [
            'courses' => [],
            'serviceError' => 'Course service is temporarily unavailable.',
        ]);
    }
    return Inertia::render('courses/index', ['courses' => $response->json('data')]);
} catch (\Exception $e) {
    Log::error('courses_index_failed', ['error' => $e->getMessage()]);
    return Inertia::render('courses/index', [
        'courses' => [],
        'serviceError' => 'Course service is temporarily unavailable.',
    ]);
}
```

Frontend renders error banner when `serviceError` is set.

## Chat Virtualization

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
    height={listHeight}
    itemCount={processedMessages.length}
    itemSize={80}
    width="100%"
>
    {({ index, style }) => (
        <div style={style}>
            <ChatMessageItem message={processedMessages[index]} />
        </div>
    )}
</FixedSizeList>
```

Trade-off: lose `AnimatePresence` smooth animations for items entering/leaving. Acceptable for >100 messages.

Alternative: only virtualize when `messages.length > 100`, keep AnimatePresence below threshold.

## Chart Memoization

```typescript
// MetricsRadarChart.tsx
const data = useMemo(() => ({
    labels: metrics.labels,
    datasets: [...]
}), [metrics]);

const options = useMemo(() => ({...}), []);
```

## Remove Unused Chart Lib

```bash
grep -rn "vue-chartjs" resources/js/
# If 0 results:
npm uninstall vue-chartjs
```
