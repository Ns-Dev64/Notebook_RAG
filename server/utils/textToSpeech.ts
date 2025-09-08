import { KokoroTTS } from "kokoro-js";
import { textToTranscribe } from "./contentSplitter.ts";
import { Writer } from "wav";

let tts: KokoroTTS | null = null;

const model_id = "onnx-community/Kokoro-82M-ONNX";

export interface VoiceModel{
    
}

async function getTts() {
    if (tts) return tts;

    tts = await KokoroTTS.from_pretrained(model_id, {
        device: "cpu",
        dtype: "fp16",
    });

    return tts;
}

export async function textToSpeech(content: string) {
    const tts = await getTts();
    const chunks = await textToTranscribe(content);
    let chunky = 0;

    const sampleRate = 22050; 
    
    const writer = new Writer({
        sampleRate: sampleRate,
        channels: 1,
        bitDepth: 16
    });

    const buffers: Buffer[] = [];

    writer.on('data', (chunk: Buffer) => {
        buffers.push(chunk);
    });

    for (const chunk of chunks) {
        console.log(`chunks:${chunky++}`);
        
        const audio = await tts.generate(chunk, {
            voice: "af_bella",
        });

        const audioData = audio.audio;
        
        const pcmBuffer = Buffer.alloc(audioData.length * 2);
        for (let i = 0; i < audioData.length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]!));
            pcmBuffer.writeInt16LE(sample * 0x7FFF, i * 2);
        }

        writer.write(pcmBuffer);
    }

    writer.end();

    
    await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
    
    const finalBuffer = Buffer.concat(buffers);
    return finalBuffer;
}

