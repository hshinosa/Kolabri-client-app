# Design

## Laravel Throttle

Laravel built-in `throttle` middleware uses cache:

```php
// routes/web.php
Route::middleware('auth.jwt')->group(function () {
    // Upload: 30 per 5 minutes
    Route::post('/api/chat/upload', [ChatUploadController::class, 'store'])
        ->middleware('throttle:30,5')
        ->name('chat.upload');
    
    // Chat-space mutations: 10 per 5 minutes
    Route::middleware('throttle:10,5')->group(function () {
        Route::post('/student/courses/{course}/chat-spaces/{chatSpace}/close', ...);
        Route::post('/student/courses/{course}/chat-spaces/{chatSpace}/reflection', ...);
    });
    
    // Admin export: 10 per minute
    Route::middleware('throttle:10,1')->group(function () {
        Route::get('/admin/users/export', ...);
        Route::get('/admin/master-data/export', ...);
    });
});
```

Throttle key defaults to user ID + route, which is correct for our use case.

## axios withCredentials

```typescript
// app.tsx
import axios from 'axios';

axios.defaults.withCredentials = true;
const csrfToken = ...;
if (csrfToken) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
}
```

## Trade-offs

- **Throttle**: 429 responses on hit. Frontend should handle gracefully (show toast, retry-after header).
- **withCredentials**: defensive. No downside for same-origin; required for cross-origin.
