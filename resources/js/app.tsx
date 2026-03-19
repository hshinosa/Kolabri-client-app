import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';

const appName = import.meta.env.VITE_APP_NAME || 'Kolabri';

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ErrorBoundary>
                <App {...props} />
                <Toaster />
            </ErrorBoundary>
        );
    },
    progress: {
        color: '#2563EB', // primary-600
    },
});
