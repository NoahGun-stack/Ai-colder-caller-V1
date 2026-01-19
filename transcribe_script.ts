
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error("Error: VITE_OPENAI_API_KEY not found in .env.local");
    process.exit(1);
}

async function transcribe() {
    const filePath = path.resolve(__dirname, 'training_audio.wav');

    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        process.exit(1);
    }

    console.log(`Transcribing ${filePath}...`);
    console.log(`File size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(filePath)], { type: 'audio/wav' });
    formData.append('file', fileBlob, 'training_audio.wav');
    formData.append('model', 'whisper-1');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${error}`);
        }

        const data = await response.json();
        console.log("\n--- TRANSCRIPT START ---\n");
        console.log(data.text);
        console.log("\n--- TRANSCRIPT END ---\n");

    } catch (error) {
        console.error("Transcription failed:", error);
    }
}

transcribe();
