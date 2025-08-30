import { parentPort } from "node:worker_threads";
import { type AutomaticSpeechRecognitionOutput } from "@huggingface/transformers";
import { audioTranscriber } from "../utils/audioTranscriber.ts";
import type { MessageDto } from "./workerDto.js";

if (!parentPort) {
    throw new Error('This script should only be run as a worker thread');
}

parentPort.on("message", async (event) => {

    const { filePath, type } = event;
    let messagePayload: MessageDto = {
        message: "",
        data: [],
        success: false
    };
    
    try {

        
        if (!filePath || !type) {
            messagePayload.message = "Invalid file path or type";
            messagePayload.data = [];
            messagePayload.success = false;

            return parentPort?.postMessage(messagePayload);
        }

        if (type === "audio" || type === "video") {
            const chunks = await audioTranscriber(filePath) as AutomaticSpeechRecognitionOutput;

            messagePayload.data = chunks;
            messagePayload.message = `Processed file ${filePath}`;
            messagePayload.success = true;

            return parentPort?.postMessage(messagePayload);
        } 
        else {
            messagePayload.message = "Invalid file type";
            messagePayload.data = [];
            messagePayload.success = false;
            
            return parentPort?.postMessage(messagePayload);
        }

    } catch (err) {
        
        messagePayload.message = `Error occurred while processing file: ${filePath}. Error: ${err instanceof Error ? err.message : String(err)}`;
        messagePayload.success = false;
        messagePayload.data = [];

        parentPort?.postMessage(messagePayload);
    }
});