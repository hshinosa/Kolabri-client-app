import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const pageProps = vi.hoisted(() => ({
    flash: {} as { success?: string; error?: string; info?: string },
    errors: undefined as Record<string, string> | undefined,
    auth: { user: { name: 'Test User' } },
    name: 'Kolabri',
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: pageProps }),
    router: { visit: vi.fn(), post: vi.fn() },
    Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    },
}));

import { ToastNotification } from '@/components/ui/ToastNotification';

describe('ToastNotification', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        pageProps.flash = {};
        pageProps.errors = undefined;
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('renders a success flash toast', async () => {
        pageProps.flash = { success: 'Berhasil disimpan' };

        render(<ToastNotification />);

        expect(screen.getByText('Berhasil disimpan')).toBeInTheDocument();
    });

    it('renders error and info flash toasts together when both exist', async () => {
        pageProps.flash = { error: 'Terjadi error', info: 'Info terbaru' };

        render(<ToastNotification />);

        expect(screen.getByText('Terjadi error')).toBeInTheDocument();
        expect(screen.getByText('Info terbaru')).toBeInTheDocument();
    });

    it('shows only the first validation error to avoid spamming', async () => {
        pageProps.errors = {
            email: 'Email wajib diisi',
            password: 'Password wajib diisi',
        };

        render(<ToastNotification />);

        expect(screen.getByText('Email wajib diisi')).toBeInTheDocument();
        expect(screen.queryByText('Password wajib diisi')).not.toBeInTheDocument();
    });

    it('removes a toast when the close button is clicked', async () => {
        pageProps.flash = { success: 'Tutup saya' };

        render(<ToastNotification />);

        expect(screen.getByText('Tutup saya')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Tutup notifikasi' }));

        expect(screen.queryByText('Tutup saya')).not.toBeInTheDocument();
    });

    it('automatically removes a toast after 4.5 seconds', async () => {
        pageProps.flash = { success: 'Auto close' };

        render(<ToastNotification />);

        expect(screen.getByText('Auto close')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(4500);
        });

        expect(screen.queryByText('Auto close')).not.toBeInTheDocument();
    });

    it('applies dark mode styles when lightMode is false', async () => {
        pageProps.flash = { info: 'Dark mode toast' };

        render(<ToastNotification lightMode={false} />);

        const toastText = screen.getByText('Dark mode toast');
        expect(toastText).toHaveClass('text-slate-200');
        expect(toastText.parentElement).toHaveClass('bg-slate-900/95');
    });
});
