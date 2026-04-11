import fs from 'fs';
import path from 'path';

const mapping = {
    // Elevate Dark Backgrounds to separate them from the main black body
    'bg-[#0d0d0d]': 'bg-[#1a1a1a]',
    'bg-[#131313]': 'bg-[#262626]',

    // Brighten Text
    'text-[#f0ece4]': 'text-white',
    'text-[#e0dcd4]': 'text-white',
    // Muted text gets a huge bump to ensure readability
    'text-[#a3a3a3]': 'text-[#d1d5db]',
    'text-[#888888]': 'text-[#e5e7eb]',

    // Brighten Borders
    'border-[#222222]': 'border-[#404040]',
    'border-[#333333]': 'border-[#525252]',
    'border-[#444444]': 'border-[#666666]'
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

        if (modified) {
            fs.writeFileSync(p, content, 'utf8');
            console.log(`Updated ${p}`);
        }
    }
}

processPath('/Users/noahgunawan/Desktop/roofpulse-ai---cold-call-platform/components');
processPath('/Users/noahgunawan/Desktop/roofpulse-ai---cold-call-platform/App.tsx');
