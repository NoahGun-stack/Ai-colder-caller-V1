import fs from 'fs';
import path from 'path';

const mapping = {
    // Backgrounds
    'bg-white': 'bg-[#080808]',
    'bg-[#f8f9fb]': 'bg-[#0d0d0d]',
    'bg-[#f3f4f6]': 'bg-[#131313]',
    'bg-[#f9fafb]': 'bg-[#131313]',
    'bg-gray-50': 'bg-[#0d0d0d]',
    'bg-gray-100': 'bg-[#131313]',

    // Main Text
    'text-[#111827]': 'text-[#f0ece4]',
    'text-[#374151]': 'text-[#e0dcd4]',
    'text-gray-900': 'text-[#f0ece4]',
    'text-gray-800': 'text-[#e0dcd4]',

    // Muted Text
    'text-[#6b7280]': 'text-[#a3a3a3]',
    'text-[#9ca3af]': 'text-[#888888]',
    'text-gray-500': 'text-[#a3a3a3]',
    'text-gray-400': 'text-[#888888]',

    // Accent Indigo -> Gold
    'bg-[#4338ca]': 'bg-[#d4a843]',
    'text-[#4338ca]': 'text-[#d4a843]',
    'border-[#4338ca]': 'border-[#d4a843]',
    'bg-[#3730a3]': 'bg-[#e8c06a]',
    'text-[#3730a3]': 'text-[#e8c06a]',
    'border-[#3730a3]': 'border-[#e8c06a]',

    'bg-indigo-600': 'bg-[#d4a843]',
    'text-indigo-600': 'text-[#d4a843]',
    'border-indigo-600': 'border-[#d4a843]',
    'bg-indigo-50/30': 'bg-[#1a1a1a]',
    'text-indigo-900': 'text-[#f0ece4]',
    'text-indigo-700/70': 'text-[#d4a843]',
    'border-indigo-100': 'border-[#222222]',
    
    // Other Accents (Tone down to fit dark theme)
    'bg-purple-100': 'bg-[#1a1a1a]',
    'text-purple-800': 'text-[#c084fc]',
    'border-purple-200': 'border-[#333333]',

    // Borders
    'border-[#e5e7eb]': 'border-[#222222]',
    'border-[#d1d5db]': 'border-[#333333]',
    'border-[#9ca3af]': 'border-[#444444]',
    'border-gray-200': 'border-[#222222]',
    'border-gray-300': 'border-[#333333]'
};

function processPath(p) {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
        if (p.includes('node_modules') || p.includes('dist')) return;
        const files = fs.readdirSync(p);
        for (const file of files) {
            processPath(path.join(p, file));
        }
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
        let content = fs.readFileSync(p, 'utf8');
        let modified = false;

        // Direct substring replacement for mapping keys
        for (const [oldClass, newClass] of Object.entries(mapping)) {
            const escapedOld = oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?<=[\\s"'\\\`])${escapedOld}(?=[\\s"'\\\`])`, 'g');
            
            if (regex.test(content)) {
                content = content.replace(regex, newClass);
                modified = true;
            }

            if (content.includes(oldClass)) {
                 content = content.split(oldClass).join(newClass);
                 modified = true;
            }
        }

        if (content.includes('bg-white')) {
            content = content.split('bg-white').join('bg-[#080808]');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(p, content, 'utf8');
            console.log(`Updated ${p}`);
        }
    }
}

processPath('/Users/noahgunawan/Desktop/roofpulse-ai---cold-call-platform/components');
processPath('/Users/noahgunawan/Desktop/roofpulse-ai---cold-call-platform/App.tsx');

