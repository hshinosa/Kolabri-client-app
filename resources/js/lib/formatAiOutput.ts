const LIST_MARKER_RE = /^\s*(?:[-*+]\s+|\d+[.)]\s+|>\s+|#{1,6}\s+)/;
const DAY_HEADING_RE = /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\s*[—-]\s*(.+)$/i;

// Common Indonesian section title patterns (without trailing colon)
const SECTION_TITLE_PATTERNS = [
    /^(Prinsip|Cara|Langkah|Strategi|Tips|Contoh|Format|Template|Ringkasan|Perbedaan|Analogi)\s+/i,
    /^(Cara membagi|Cara nenangin|Langkah belajar|Strategi \d+|Tips supaya)/i,
    /^(\d+\)\s+)/,  // Numbered sections like "1) Petakan dulu..."
];

function isMarkdownLine(line: string): boolean {
    return LIST_MARKER_RE.test(line) || /^---+$/.test(line.trim());
}

function isLikelySectionTitle(line: string): boolean {
    if (line.endsWith(':')) return true;
    for (const pattern of SECTION_TITLE_PATTERNS) {
        if (pattern.test(line)) return true;
    }
    return false;
}

function isShortPlainLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (isMarkdownLine(trimmed) || isLikelySectionTitle(trimmed)) return false;
    if (trimmed.length > 110) return false;
    return true;
}

function looksLikeListItem(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.length > 80) return false;
    if (/^[•·\-\*]\s/.test(trimmed)) return true;
    if (trimmed.endsWith(':')) return false;
    if (/[.!?]$/.test(trimmed)) return false;
    return true;
}

export function formatAiOutput(input: string): string {
    const normalized = input.replace(/\r\n/g, '\n').trim();
    if (!normalized) return normalized;

    const lines = normalized.split('\n').map((line) => line.trimEnd());
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
            if (result[result.length - 1] !== '') {
                result.push('');
            }
            continue;
        }

        const dayMatch = line.match(DAY_HEADING_RE);
        if (dayMatch) {
            if (result[result.length - 1] !== '') {
                result.push('');
            }
            result.push(`### ${dayMatch[1]} — ${dayMatch[2]}`);
            continue;
        }

        if (isLikelySectionTitle(line)) {
            const formattedTitle = line.endsWith(':') ? `**${line}**` : `**${line}:**`;
            result.push(formattedTitle);

            let j = i + 1;
            const plainGroup: string[] = [];
            while (j < lines.length) {
                const candidate = lines[j].trim();
                if (!candidate) break;
                if (!isShortPlainLine(candidate)) break;
                if (!looksLikeListItem(candidate)) break;
                plainGroup.push(candidate.replace(/^[•·]\s*/, '').replace(/,+$/, ''));
                j++;
            }

            if (plainGroup.length >= 2) {
                result.push(...plainGroup.map((item) => `- ${item}`));
                i = j - 1;
            }
            continue;
        }

        let j = i;
        const run: string[] = [];
        while (j < lines.length) {
            const candidate = lines[j].trim();
            if (!candidate || !isShortPlainLine(candidate)) break;
            if (!looksLikeListItem(candidate)) break;
            run.push(candidate.replace(/^[•·]\s*/, '').replace(/,+$/, ''));
            j++;
        }

        if (run.length >= 3) {
            result.push(...run.map((item) => `- ${item}`));
            i = j - 1;
            continue;
        }

        result.push(line);
    }

    return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
