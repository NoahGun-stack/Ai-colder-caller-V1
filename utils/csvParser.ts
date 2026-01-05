import { Lead, LeadStatus } from '../types';

export const parseCSV = (content: string): Partial<Lead>[] => {
    // Remove BOM and trim
    const cleanContent = content.trim().replace(/^\uFEFF/, '');
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // Auto-detect delimiter
    const firstLine = lines[0];
    let delimiter = ',';
    if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
        delimiter = ';';
    } else if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
        delimiter = '\t';
    }

    // Robust CSV line parser
    const parseLine = (text: string) => {
        const result: string[] = [];
        let start = 0;
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '"') {
                inQuotes = !inQuotes;
            } else if (text[i] === delimiter && !inQuotes) {
                let field = text.substring(start, i).trim();
                // strip surrounding quotes and unescape double quotes
                if (field.startsWith('"') && field.endsWith('"')) {
                    field = field.slice(1, -1).replace(/""/g, '"');
                }
                result.push(field);
                start = i + 1;
            }
        }
        // Last field
        let field = text.substring(start).trim();
        if (field.startsWith('"') && field.endsWith('"')) {
            field = field.slice(1, -1).replace(/""/g, '"');
        }
        result.push(field);

        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase());

    const mapHeader = (h: string): keyof Lead | null => {
        if (h.includes('first') || h === 'firstname' || h === 'fname' || h === 'name' || h === 'full name') return 'firstName';
        if (h.includes('last') || h === 'lastname' || h === 'lname') return 'lastName';
        // Expanded phone synonyms
        if (h.includes('phone') || h === 'mobile' || h === 'cell' || h === 'number' || h.includes('contact') || h.includes('tel')) return 'phoneNumber';
        if (h.includes('addres') || h === 'street' || h === 'location' || h.includes('addr')) return 'address';
        if (h === 'city') return 'city';
        if (h === 'state') return 'state';
        if (h === 'zip' || h.includes('postal') || h.includes('code')) return 'zip';
        if (h === 'notes' || h === 'description' || h === 'info') return 'notes';
        return null;
    };

    const keyMap = headers.map(mapHeader);

    // Filter out rows that are entirely empty or failed to parse
    return lines.slice(1).map(line => {
        const values = parseLine(line);
        const lead: any = {
            status: LeadStatus.NOT_CALLED,
            tcpaAcknowledged: true
        };

        values.forEach((value, index) => {
            const key = keyMap[index];
            if (key) {
                lead[key] = value;
            }
        });

        // Heuristic to handle "Full Name" mapped to firstName
        if (lead.firstName && !lead.lastName && lead.firstName.includes(' ')) {
            const parts = lead.firstName.split(' ');
            lead.firstName = parts[0];
            lead.lastName = parts.slice(1).join(' ');
        }

        // Basic validation: Must have at least a name OR a phone number
        const hasName = (lead.firstName && lead.firstName !== 'Unknown') || (lead.lastName && lead.lastName !== 'Prospect');
        const hasPhone = lead.phoneNumber && lead.phoneNumber.length > 5; // Basic length check

        if (!hasName && !hasPhone) return null;

        // Default Unknowns
        if (!lead.firstName) lead.firstName = 'Unknown';
        if (!lead.lastName) lead.lastName = 'Prospect';

        return lead;
    }).filter((l): l is Partial<Lead> => l !== null);
};
