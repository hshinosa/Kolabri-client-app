type CsvRecord = Record<string, string>;

function escapeCsvValue(value: unknown) {
    const normalized = value == null ? '' : String(value);
    const escaped = normalized.replace(/"/g, '""');

    return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function normalizeLineEndings(content: string) {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function splitCsvRow(row: string) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < row.length; index += 1) {
        const character = row[index];
        const nextCharacter = row[index + 1];

        if (character === '"') {
            if (inQuotes && nextCharacter === '"') {
                current += '"';
                index += 1;
                continue;
            }

            inQuotes = !inQuotes;
            continue;
        }

        if (character === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += character;
    }

    values.push(current.trim());

    return values;
}

function parseCsvText(content: string) {
    const normalizedContent = normalizeLineEndings(content).trim();

    if (!normalizedContent) {
        return [];
    }

    const rows: string[] = [];
    let currentRow = '';
    let inQuotes = false;

    for (let index = 0; index < normalizedContent.length; index += 1) {
        const character = normalizedContent[index];
        const nextCharacter = normalizedContent[index + 1];

        if (character === '"') {
            if (inQuotes && nextCharacter === '"') {
                currentRow += '""';
                index += 1;
                continue;
            }

            inQuotes = !inQuotes;
            currentRow += character;
            continue;
        }

        if (character === '\n' && !inQuotes) {
            rows.push(currentRow);
            currentRow = '';
            continue;
        }

        currentRow += character;
    }

    if (currentRow.length > 0) {
        rows.push(currentRow);
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = splitCsvRow(rows[0]).map((header) => header.trim());

    return rows.slice(1).filter((row) => row.trim().length > 0).map((row) => {
        const values = splitCsvRow(row);

        return headers.reduce<CsvRecord>((record, header, headerIndex) => {
            record[header] = values[headerIndex] ?? '';
            return record;
        }, {});
    });
}

export function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string) {
    if (data.length === 0) {
        throw new Error('Tidak ada data untuk diexport.');
    }

    const headers = Object.keys(data[0]);
    const lines = [
        headers.join(','),
        ...data.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
    ];

    const csvContent = `${lines.join('\r\n')}\r\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function parseCSV(file: File): Promise<CsvRecord[]> {
    const content = await file.text();
    return parseCsvText(content);
}

export function validateCSVColumns(data: CsvRecord[], requiredColumns: string[]) {
    if (data.length === 0) {
        throw new Error('File CSV kosong atau tidak memiliki baris data.');
    }

    const availableColumns = Object.keys(data[0]).map((column) => column.trim());
    const missingColumns = requiredColumns.filter((column) => !availableColumns.includes(column));

    if (missingColumns.length > 0) {
        throw new Error(`Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}`);
    }
}

export type { CsvRecord };
