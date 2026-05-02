import { describe, expect, it } from 'vitest';

import { formatAiOutput } from '@/lib/formatAiOutput';

describe('formatAiOutput', () => {
    it('returns an empty string for blank input', () => {
        expect(formatAiOutput('   \n\n  ')).toBe('');
    });

    it('converts day headings into markdown headings', () => {
        expect(formatAiOutput('Senin - Fokus Belajar')).toBe('### Senin — Fokus Belajar');
        expect(formatAiOutput('Selasa — Review materi')).toBe('### Selasa — Review materi');
    });

    it('keeps existing markdown list items unchanged', () => {
        expect(formatAiOutput('- item satu\n- item dua')).toBe('- item satu\n- item dua');
    });

    it('formats section titles ending with a colon in bold', () => {
        expect(formatAiOutput('Tips:')).toBe('**Tips:**');
    });

    it('formats likely section titles without a colon and converts the following short lines into bullets', () => {
        expect(formatAiOutput('Tips supaya fokus\nMatikan notifikasi\nPakai timer\nIstirahat cukup')).toBe(
            '**Tips supaya fokus:**\n- Matikan notifikasi\n- Pakai timer\n- Istirahat cukup',
        );
    });

    it('turns a run of three short plain lines into a bullet list', () => {
        expect(formatAiOutput('Bangun ritme\nCatat progres\nEvaluasi mingguan')).toBe(
            '- Bangun ritme\n- Catat progres\n- Evaluasi mingguan',
        );
    });

    it('does not convert a short run with fewer than three lines into bullets', () => {
        expect(formatAiOutput('Bangun ritme\nCatat progres')).toBe('Bangun ritme\nCatat progres');
    });

    it('removes leading bullet glyphs and trailing commas when building lists', () => {
        expect(formatAiOutput('Cara membagi waktu\n• Pagi untuk baca,\n• Siang untuk latihan,\n• Malam untuk review,')).toBe(
            '**Cara membagi waktu:**\n- Pagi untuk baca\n- Siang untuk latihan\n- Malam untuk review',
        );
    });

    it('preserves long plain lines as paragraphs instead of list items', () => {
        const longLine = 'Kalimat ini sengaja dibuat cukup panjang supaya melewati batas karakter dan tetap dianggap sebagai paragraf biasa oleh formatter.';
        expect(formatAiOutput(`Judul\n${longLine}`)).toBe(`Judul\n${longLine}`);
    });

    it('collapses repeated blank lines to a maximum of one empty line', () => {
        expect(formatAiOutput('Halo\n\n\n\nDunia')).toBe('Halo\n\nDunia');
    });
});
