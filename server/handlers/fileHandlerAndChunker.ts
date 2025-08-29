import { split, textsplitter } from "../utils/contentSplitter";
import { audioTranscriber, audioFromVideoTranscriber } from "../utils/audioTranscriber";
import { embedder } from "../utils/embedder";
import { t } from "elysia";
import { getPineconeClient } from "../db/init";
import { findOrUpsertConversation } from "../db/operations";
import { mkdir, unlink } from "fs/promises"
import type { User } from "./userHandler";
import type { AutomaticSpeechRecognitionOutput } from "@huggingface/transformers";
import ffmpeg from "fluent-ffmpeg";
import MultiMediaProcessor from "../workers/master";
import type { MessageDto } from "../workers/workerDto";

const pineConeClient = await getPineconeClient();

export const uploaderSchema = {
    body: t.Object({
        convoId: t.Optional(t.String()),
        file: t.File({
            type: [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',

            ],
            maxSize: '50m'
        })
    })
}

export const multiMediaSchema = {
    body: t.Object({
        convoId: t.Optional(t.String()),
        file: t.File({
            type: [
                'video/*',
                'audio/*'
            ]
        })
    })
}

export const uploader = async ({ body, user }: {
    body: typeof uploaderSchema.body,
    user: User
}) => {

    const file = body.file as File;
    const convoId = body.convoId as string;
    const tempDir = './temp/docs'

    await mkdir(tempDir, { recursive: true });

    const timestamp = Date.now()
    const tempFilename = `temp_${timestamp}_${file.name}`
    const tempPath = `${tempDir}/${tempFilename}`;
    let chunks!: "" | any[];

    try {
        await Bun.write(tempPath, file);

        chunks = await split(tempPath, file.type);
    }
    catch (err) {
        await unlink(tempPath);
        throw err;

    }

    await unlink(tempPath);

    if (!chunks || chunks.length === 0) throw new Error("Error occured while processing file, Please upload again")

    let chunkEmbeddings: {
        content: string,
        embeddings: number[]
    }[] = [];



    chunkEmbeddings = await Promise.all(
        chunks.map(async (chunk) => ({
            content: chunk.pageContent,
            embeddings: await embedder(chunk.pageContent)
        }))
    );

    const id = Date.now();

    const vectors = chunkEmbeddings.map((embedding, idx) => {
        return {
            id: `${id}-${idx}`,
            values: embedding.embeddings,
            metadata: {
                content: embedding.content
            }
        }
    });

    let convo = await findOrUpsertConversation(convoId, user);

    let namespaceKey = `${user.id}-${convo?._id}`

    await pineConeClient.namespace(namespaceKey).upsert(vectors);

    return {
        message: "Document parsed sucessfully",
        sucess: true,
        convoId: convo?._id
    }
}


export const multiMediaUploader = async ({ body, user }: {
    body: typeof multiMediaSchema.body,
    user: User
}) => {

    const file = body.file as File;
    const convoId = body.convoId as string;
    const tempDir = './temp/multimedia';

    let isConvoValid = await findOrUpsertConversation(convoId, user);
    if (isConvoValid?.messages.length > 250) throw new Error("Conversation length exceeded");

    await mkdir(tempDir, { recursive: true });

    const timestamp = Date.now()
    let tempFilename = `temp_${timestamp}_${file.name}`
    let tempPath = `${tempDir}/${tempFilename}`;
    let chunks!: MessageDto;


    try {
        await Bun.write(tempPath, file);
        const processor = new MultiMediaProcessor();
        
        if (file.type.includes("audio")) {
            
            const proccessedAudioPath=`${tempDir}/temp_${timestamp}_proccessed.wav`;
            
            await new Promise<void>((res,rej)=>{
                
                ffmpeg(tempPath)
                .toFormat("wav")
                .audioFrequency(16000)
                .audioChannels(1)
                .on("end",()=>{
                    res();
                })
                .on("error",(err)=>{
                    rej(err)
                })
                .save(proccessedAudioPath)
            })  
            
            const workerId = processor.createWorker();
            
            chunks=await processor.processMedia(workerId,proccessedAudioPath,"audio");
            
            await unlink(proccessedAudioPath);

        }
        if (file.type.includes("video")) {

            const workerId = processor.createWorker();

            chunks = await processor.processMedia(workerId,tempPath,"video");

        }
    }
    catch (err) {
        await unlink(tempPath);
        throw err;
    }

    

    await unlink(tempPath);

    console.log(chunks);
    return;

    if (!chunks) throw new Error("Error occured while processing file, Please upload again")

    let chunkEmbeddings: {
        content: string,
        embeddings: number[]
    }[] = [];



    // if (Array.isArray(chunks.chunks)) {
    //     chunkEmbeddings = await Promise.all(
    //         chunks.chunks.map(async (chunk) => ({
    //             content: `chunk: ${chunk.text} at timestamp:${chunk.timestamp}`,
    //             embeddings: await embedder(chunk.text)
    //         }))
    //     )
    // }



    const vectors = chunkEmbeddings.map((embedding, idx) => {
        return {
            id: `${timestamp}-${idx}`,
            values: embedding.embeddings,
            metadata: {
                content: embedding.content
            }
        }
    });

    let convo = await findOrUpsertConversation(convoId, user);

    let namespaceKey = `${user.id}-${convo?._id}`

    await pineConeClient.namespace(namespaceKey).upsert(vectors);

    return {
        message: "Document parsed sucessfully",
        sucess: true,
        convoId: convo?._id
    }


}
