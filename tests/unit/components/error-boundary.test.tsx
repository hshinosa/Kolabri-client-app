import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    },
}));

import { ErrorBoundary } from '@/components/error-boundary';

function ProblemChild({ shouldThrow = false }: { shouldThrow?: boolean }) {
    if (shouldThrow) {
        throw new Error('Kaboom');
    }

    return <div>Healthy child</div>;
}

describe('ErrorBoundary', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders children when no error is thrown', () => {
        render(
            <ErrorBoundary>
                <ProblemChild />
            </ErrorBoundary>,
        );

        expect(screen.getByText('Healthy child')).toBeInTheDocument();
    });

    it('renders the default fallback UI when a child throws', () => {
        render(
            <ErrorBoundary>
                <ProblemChild shouldThrow />
            </ErrorBoundary>,
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(
            screen.getByText('An unexpected error occurred. Please try again or contact support if the problem persists.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Go Home' })).toHaveAttribute('href', '/');
    });

    it('renders a custom fallback when one is provided', () => {
        render(
            <ErrorBoundary fallback={<div>Custom fallback</div>}>
                <ProblemChild shouldThrow />
            </ErrorBoundary>,
        );

        expect(screen.getByText('Custom fallback')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('resets to the children when Try Again is clicked and the error is gone', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ProblemChild shouldThrow />
            </ErrorBoundary>,
        );

        rerender(
            <ErrorBoundary>
                <ProblemChild />
            </ErrorBoundary>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

        expect(screen.getByText('Healthy child')).toBeInTheDocument();
    });
});
