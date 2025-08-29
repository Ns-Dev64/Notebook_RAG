import type { AutomaticSpeechRecognitionOutput } from "@huggingface/transformers";

export interface MessageDto{

    message:string,
    success:boolean,
    data: [] | AutomaticSpeechRecognitionOutput;

}


