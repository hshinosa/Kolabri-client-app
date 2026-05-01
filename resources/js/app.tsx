import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { setupAxiosInterceptors } from '@/lib/auth';
import { refreshCsrfToken } from '@/lib/csrfRefresh';
import axios from 'axios';

const appName = import.meta.env.VITE_APP_NAME || 'Kolabri';

setupAxiosInterceptors();

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (csrfToken) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
}

router.on('error', async (event) => {
    const errorEvent = event as { detail: { errors: Record<string, unknown> } };
    const errors = errorEvent.detail.errors;
    
    if (errors && typeof errors === 'object' && 'message' in errors) {
        const message = String(errors.message);
        if (message.includes('419') || message.toLowerCase().includes('csrf')) {
            await refreshCsrfToken();
        }
    }
});

/*
 * Page-transition overlay — only activates when navigating between
 * different layout zones (welcome ↔ auth ↔ dashboard).
 * Skipped for: POST/PUT/PATCH/DELETE, same-zone GET, form errors.
 */
function getOrCreateOverlay(): HTMLDivElement {
    let el = document.getElementById('page-transition-overlay') as HTMLDivElement | null;
    if (!el) {
        el = document.createElement('div');
        el.id = 'page-transition-overlay';
        el.style.cssText =
            'position:fixed;inset:0;z-index:99999;pointer-events:none;opacity:0;';
        document.body.appendChild(el);
    }
    return el;
}

function currentBg(): string {
    const isDark =
        localStorage.getItem('kolabri_theme') === 'dark' ||
        localStorage.getItem('kolabri-dark') === 'true';
    return isDark ? '#0a0a0f' : '#E8EDF8';
}

type LayoutZone = 'welcome' | 'auth' | 'app';

function getZone(url: string): LayoutZone {
    if (url === '/' || url === '') return 'welcome';
    if (/^\/(login|register|forgot-password|reset-password)/.test(url)) return 'auth';
    return 'app';
}

let overlayActive = false;

router.on('start', (event) => {
    const visit = (event as { detail: { visit: { method: string; url: URL } } }).detail.visit;

    if (visit.method !== 'get') {
        overlayActive = false;
        return;
    }

    const fromZone = getZone(window.location.pathname);
    const toZone = getZone(visit.url.pathname);

    if (fromZone === toZone) {
        overlayActive = false;
        return;
    }

    overlayActive = true;
    const o = getOrCreateOverlay();
    o.style.transition = 'none';
    o.style.backgroundColor = currentBg();
    o.style.opacity = '1';
});

router.on('finish', () => {
    if (!overlayActive) return;
    overlayActive = false;

    const o = getOrCreateOverlay();
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            o.style.transition = 'opacity 0.3s ease';
            o.style.opacity = '0';
        });
    });
});

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ErrorBoundary>
                <App {...props} />
                <Toaster />
            </ErrorBoundary>,
        );
    },
    progress: {
        color: '#88161c',
        showSpinner: false,
    },
});
