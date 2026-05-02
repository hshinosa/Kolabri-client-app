import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { exportToCSV, parseCSV, validateCSVColumns } from '@/lib/csv-utils';

describe('parseCSV', () => {
    it('parses simple csv rows into records', async () => {
        const file = new File(['name,email\nAlice,alice@example.com\nBob,bob@example.com'], 'users.csv', {
            type: 'text/csv',
        });

        await expect(parseCSV(file)).resolves.toEqual([
            { name: 'Alice', email: 'alice@example.com' },
            { name: 'Bob', email: 'bob@example.com' },
        ]);
    });

    it('returns an empty array for blank csv content', async () => {
        const file = new File(['   \n\n  '], 'empty.csv', { type: 'text/csv' });

        await expect(parseCSV(file)).resolves.toEqual([]);
    });

    it('handles quoted commas, escaped quotes, and embedded newlines', async () => {
        const file = new File(
            ['name,notes\n"Alice, A.","Says ""hello"""\nBob,"Line 1\nLine 2"'],
            'quoted.csv',
            { type: 'text/csv' },
        );

        await expect(parseCSV(file)).resolves.toEqual([
            { name: 'Alice, A.', notes: 'Says "hello"' },
            { name: 'Bob', notes: 'Line 1\nLine 2' },
        ]);
    });

    it('normalizes windows and legacy mac line endings', async () => {
        const file = new File(['name,email\r\nAlice,alice@example.com\rBob,bob@example.com'], 'mixed.csv', {
            type: 'text/csv',
        });

        await expect(parseCSV(file)).resolves.toEqual([
            { name: 'Alice', email: 'alice@example.com' },
            { name: 'Bob', email: 'bob@example.com' },
        ]);
    });

    it('fills missing column values with empty strings', async () => {
        const file = new File(['name,email,role\nAlice,alice@example.com'], 'partial.csv', {
            type: 'text/csv',
        });

        await expect(parseCSV(file)).resolves.toEqual([
            { name: 'Alice', email: 'alice@example.com', role: '' },
        ]);
    });
});

describe('validateCSVColumns', () => {
    it('does not throw when all required columns exist', () => {
        expect(() =>
            validateCSVColumns([{ name: 'Alice', email: 'alice@example.com' }], ['name', 'email']),
        ).not.toThrow();
    });

    it('trims available column names before validation', () => {
        expect(() => validateCSVColumns([{ ' name ': 'Alice', email: 'alice@example.com' }], ['name', 'email'])).not.toThrow();
    });

    it('throws when csv data has no rows', () => {
        expect(() => validateCSVColumns([], ['name'])).toThrow('File CSV kosong atau tidak memiliki baris data.');
    });

    it('throws with the missing column names', () => {
        expect(() =>
            validateCSVColumns([{ name: 'Alice', email: 'alice@example.com' }], ['name', 'email', 'role']),
        ).toThrow('Kolom wajib tidak ditemukan: role');
    });
});

describe('exportToCSV', () => {
    const createObjectURL = vi.fn(() => 'blob:csv-url');
    const revokeObjectURL = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let clickSpy: ReturnType<typeof vi.fn>;
    let createdLink: HTMLAnchorElement | null;

    beforeEach(() => {
        clickSpy = vi.fn();
        createdLink = null;
        createObjectURL.mockClear();
        revokeObjectURL.mockClear();
        appendChildSpy = vi.spyOn(document.body, 'appendChild');
        removeChildSpy = vi.spyOn(document.body, 'removeChild');

        vi.stubGlobal('URL', {
            createObjectURL,
            revokeObjectURL,
        });

        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'a') {
                const link = originalCreateElement('a');
                link.click = clickSpy as unknown as () => void;
                createdLink = link;
                return link;
            }

            return originalCreateElement(tagName);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('throws when exporting an empty dataset', () => {
        expect(() => exportToCSV([], 'users')).toThrow('Tidak ada data untuk diexport.');
    });

    it('creates, downloads, and cleans up a csv file', async () => {
        exportToCSV(
            [
                { name: 'Alice', role: 'Admin' },
                { name: 'Bob', role: 'Student' },
            ],
            'users',
        );

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(appendChildSpy).toHaveBeenCalledTimes(1);
        expect(removeChildSpy).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv-url');

        const firstCall = (createObjectURL as Mock).mock.calls.at(0);
        expect(firstCall).toBeDefined();
        const blob = firstCall?.[0] as Blob | undefined;
        expect(blob).toBeInstanceOf(Blob);
        await expect(blob!.text()).resolves.toBe('name,role\r\nAlice,Admin\r\nBob,Student\r\n');
    });

    it('adds the .csv extension when the filename is missing it', () => {
        exportToCSV([{ name: 'Alice' }], 'report');

        expect(createdLink?.download).toBe('report.csv');
    });

    it('preserves an existing .csv extension', () => {
        exportToCSV([{ name: 'Alice' }], 'report.csv');

        expect(createdLink?.download).toBe('report.csv');
    });

    it('escapes quotes, commas, and nullish values in exported cells', async () => {
        exportToCSV(
            [
                { name: 'Alice, A.', note: 'She said "hi"', extra: null },
                { name: 'Bob', note: 'Plain', extra: undefined },
            ],
            'special.csv',
        );

        const firstCall = (createObjectURL as Mock).mock.calls.at(0);
        expect(firstCall).toBeDefined();
        const blob = firstCall?.[0] as Blob | undefined;
        expect(blob).toBeInstanceOf(Blob);
        await expect(blob!.text()).resolves.toBe(
            'name,note,extra\r\n"Alice, A.","She said ""hi""",\r\nBob,Plain,\r\n',
        );
    });
});
