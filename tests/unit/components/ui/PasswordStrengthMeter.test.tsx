import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    },
}));

import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
    it('renders the base label and no strength text for an empty password', () => {
        render(<PasswordStrengthMeter password="" />);

        expect(screen.getByText('Kekuatan Sandi')).toBeInTheDocument();
        expect(screen.queryByText('Lemah')).not.toBeInTheDocument();
        expect(screen.queryByText(/Sandi sebaiknya memiliki minimal 8 karakter/i)).not.toBeInTheDocument();
    });

    it('shows Lemah for a password that only meets one rule', () => {
        render(<PasswordStrengthMeter password="abcdefgh" />);

        expect(screen.getByText('Lemah')).toBeInTheDocument();
        expect(screen.getByText(/Sandi sebaiknya memiliki minimal 8 karakter/i)).toBeInTheDocument();
    });

    it('shows Sedang when two rules are met', () => {
        render(<PasswordStrengthMeter password="Abcdefgh" />);

        expect(screen.getByText('Sedang')).toBeInTheDocument();
    });

    it('shows Kuat when three rules are met', () => {
        render(<PasswordStrengthMeter password="Abcdefg1" />);

        expect(screen.getByText('Kuat')).toBeInTheDocument();
    });

    it('shows Sangat Kuat and hides the helper text when all rules are met', () => {
        render(<PasswordStrengthMeter password="Abcdefg1!" />);

        expect(screen.getByText('Sangat Kuat')).toBeInTheDocument();
        expect(screen.queryByText(/Sandi sebaiknya memiliki minimal 8 karakter/i)).not.toBeInTheDocument();
    });

    it('supports dark mode colors while keeping the same labels', () => {
        render(<PasswordStrengthMeter password="Abcdefg1!" lightMode={false} />);

        expect(screen.getByText('Kekuatan Sandi')).toHaveStyle({ color: '#94a3b8' });
        expect(screen.getByText('Sangat Kuat')).toHaveStyle({ color: '#059669' });
    });
});
