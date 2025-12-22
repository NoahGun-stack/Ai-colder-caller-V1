import { Lead, LeadStatus } from '../types';

export const parseCSV = (content: string): Partial<Lead>[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

    const mapHeader = (h: string): keyof Lead | null => {
        if (h.includes('first') || h === 'firstname' || h === 'fname') return 'firstName';
        if (h.includes('last') || h === 'lastname' || h === 'lname') return 'lastName';
        if (h.includes('phone') || h === 'mobile' || h === 'cell') return 'phoneNumber';
        if (h.includes('addres') || h === 'street') return 'address';
        if (h === 'city') return 'city';
        if (h === 'state') return 'state';
        if (h === 'zip' || h.includes('postal')) return 'zip';
        if (h === 'notes') return 'notes';
        return null;
    };

    const keyMap = headers.map(mapHeader);

    return lines.slice(1).map(line => {
        // Handle simple CSV splitting (doesn't handle commas inside quotes perfectly, but sufficient for simple lists)
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const lead: any = {
            status: LeadStatus.NOT_CALLED,
            tcpaAcknowledged: true // Assuming user has verified list compliance
        };

        values.forEach((value, index) => {
            const key = keyMap[index];
            if (key) {
                lead[key] = value;
            }
        });

        // Basic validation
        if (!lead.firstName && !lead.lastName && !lead.phoneNumber) return null;

        // Default Unknowns
        if (!lead.firstName) lead.firstName = 'Unknown';
        if (!lead.lastName) lead.lastName = 'Prospect';

        return lead;
    }).filter((l): l is Partial<Lead> => l !== null);
};
