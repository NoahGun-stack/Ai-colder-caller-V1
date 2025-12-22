
export class RealtimeService {
    private ws: WebSocket | null = null;
    private isConnected = false;
    private audioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private responseQueue: Int16Array[] = [];
    private isPlaying = false;
    private nextStartTime = 0;
    public onUpdate: ((role: 'AGENT' | 'USER' | 'SYSTEM', text: string) => void) | null = null;

    constructor(private apiKey: string) { }

    async connect() {
        if (this.isConnected) return;

        const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
        // "Hack" for client-side auth in dev: pass key as subprotocol
        this.ws = new WebSocket(url, [
            'realtime',
            'openai-insecure-api-key.' + this.apiKey,
            'openai-beta.realtime-v1'
        ]);

        this.ws.onopen = () => {
            console.log('Realtime WebSocket Connected');
            this.isConnected = true;
            this.updateSession();
            this.startAudio();
            if (this.onUpdate) this.onUpdate('SYSTEM', 'Connected to OpenAI Realtime API');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (e) {
                console.error('Error parsing WF message', e);
            }
        };

        this.ws.onclose = () => {
            console.log('Realtime WebSocket Closed');
            this.isConnected = false;
            this.stopAudio();
        };

        this.ws.onerror = (err) => {
            console.error('Realtime WebSocket Error', err);
        };
    }

    updateSession() {
        if (!this.ws) return;

        // Initial session config
        const sessionUpdate = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                voice: 'alloy', // Options: alloy, echo, shimmer
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                instructions: "You represent RoofPulse AI. You are a cold caller trying to sell roofing services. Be friendly but persistent. Keep responses short."
            }
        };
        this.ws.send(JSON.stringify(sessionUpdate));
    }

    handleMessage(message: any) {
        switch (message.type) {
            case 'response.audio.delta':
                // Received audio chunk (Base64)
                this.playAudioChunk(message.delta);
                break;
            case 'response.audio.done':
                // Audio stream finished
                break;
            case 'response.text.delta':
                // console.log('AI Text:', message.delta);
                if (this.onUpdate) this.onUpdate('AGENT', message.delta);
                break;
            case 'conversation.item.input_audio_transcription.completed':
                if (this.onUpdate) this.onUpdate('USER', message.transcript);
                break;
            case 'error':
                console.error('AI Error:', message.error);
                break;
            case 'session.created':
                console.log('Session Created:', message.session);
                break;
            default:
                // console.log('Unhandled Message:', message.type);
                break;
        }
    }

    async startAudio() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const source = this.audioContext.createMediaStreamSource(this.stream);
            // Use ScriptProcessor for simplicity (AudioWorklet is better but implies separate files)
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.processor.onaudioprocess = (e) => {
                if (!this.isConnected || !this.ws) return;

                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16
                const pcmData = this.floatTo16BitPCM(inputData);

                // Convert to Base64
                const base64Audio = this.arrayBufferToBase64(pcmData.buffer);

                // Send to OpenAI
                this.ws.send(JSON.stringify({
                    type: 'input_audio_buffer.append',
                    audio: base64Audio
                }));
            };

        } catch (err) {
            console.error('Error accessing microphone', err);
        }
    }

    stopAudio() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.stopAudio();
    }

    // --- Audio Utilities ---

    private playAudioChunk(base64Delta: string) {
        if (!this.audioContext) return;

        const binary = atob(base64Delta);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);

        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }

        const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        // Simple queuing logic to prevent overlap/gaps
        const now = this.audioContext.currentTime;
        // Schedule next chunk at the end of the last one, or now if fell behind
        const start = Math.max(now, this.nextStartTime);

        source.start(start);
        this.nextStartTime = start + buffer.duration;
    }

    private floatTo16BitPCM(input: Float32Array) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}
