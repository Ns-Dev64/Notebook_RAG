declare var self:Worker;

import { type AutomaticSpeechRecognitionOutput } from "@huggingface/transformers";
import { audioTranscriber } from "../utils/audioTranscriber.ts";
import { audioFromVideoTranscriber } from "../utils/audioTranscriber.ts";
import type{ MessageDto } from "./workerDto.ts";
import type { Worker } from "node:worker_threads";



self.on("message",async(event)=>{
const { filePath, type } = event.data;
    let messagePayload!: MessageDto;

    try {
        if (!filePath || !type) {

            messagePayload.message = "Invalid file path or type";
            messagePayload.data = [];
            messagePayload.success=false;

           return postMessage(messagePayload);
        };

        self.postMessage(`Processing file ${filePath}`)

        if (type === "audio") {

            const chunks = await audioTranscriber(filePath) as AutomaticSpeechRecognitionOutput;

            messagePayload.data=chunks;
            messagePayload.message=`Processed file ${filePath}`;
            messagePayload.success=true;

            return postMessage(messagePayload);

        }
        else if (type === "video") {

            const chunks = await audioFromVideoTranscriber(filePath) as AutomaticSpeechRecognitionOutput;

            messagePayload.data=chunks;
            messagePayload.message=`Processed file ${filePath}`;
            messagePayload.success=true;

            return postMessage(messagePayload);

        }
        else {

            messagePayload.message="Invalid file type";
            messagePayload.data=[];
            messagePayload.success=false;
            
           return postMessage(messagePayload)
        }


    }
    catch (err) {

        messagePayload.message=`Error occured while proccessing file: ${filePath}`;
        messagePayload.success=false;
        messagePayload.data=[];

        postMessage(messagePayload);
    }
})

