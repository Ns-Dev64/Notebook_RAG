import type { AutomaticSpeechRecognitionOutput } from "@huggingface/transformers";

export interface MessageDto{

    message:string,
    success:boolean,
    data: [] | AutomaticSpeechRecognitionOutput | Buffer<ArrayBuffer>;

}


export interface PrcoessorDto{

    workerId:string,
    type: "podcast" | "video" | "default",
    filePath?:string , 
    content?:string,
    processor?:Function

}