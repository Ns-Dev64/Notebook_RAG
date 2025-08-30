import { AutomaticSpeechRecognitionPipeline, pipeline } from '@huggingface/transformers';
import wavefile from 'wavefile';
import fs from "fs/promises"
import { videoTranscriber } from './videoTranscriber.ts';

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

    
    let wav = new wavefile.WaveFile(audioFile);
    
    wav.toBitDepth('32f');
    
    wav.toSampleRate(16000); 
    let audioData = wav.getSamples();
    
    const transcriber = await getTranscriber();


    return await transcriber(audioData, transcriberConfig);

}

export const audioFromVideoTranscriber=async(filepath:string)=>{

    const audioBuffer=await videoTranscriber(filepath);

    const transcriber=await getTranscriber();

    let wav = new wavefile.WaveFile(audioBuffer);

    wav.toBitDepth('32f');
    
    wav.toSampleRate(16000);

    let audioData = wav.getSamples();

    return await transcriber(audioData,transcriberConfig);

}
