import { AutomaticSpeechRecognitionPipeline, pipeline } from '@huggingface/transformers';
import wavefile from 'wavefile';
import fs from "fs/promises"

let transcriber:AutomaticSpeechRecognitionPipeline | null=null;

const transcriberConfig={
    return_timestamps:true,
    chunk_length_s:30,
    stride_length_s:5
}

async function getTranscriber() {

    if(transcriber) return transcriber;

    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    return transcriber;

}

export const audioTranscriber = async (filepath: string) => {

    const audioFile = await fs.readFile(filepath);

    const transcriber = await getTranscriber();
    
    let wav = new wavefile.WaveFile(audioFile);
    
    wav.toBitDepth('32f');
    
    wav.toSampleRate(16000); 
    let audioData = wav.getSamples();
    

    return await transcriber(audioData, transcriberConfig);

}
