import { split, } from "../utils/contentSplitter";
import { embedder } from "../utils/embedder";
import { t } from "elysia";
import { getMongoClient, getPineconeClient } from "../db/init";
import { findOrUpsertConversation } from "../db/operations";
import { mkdir, unlink } from "fs/promises"
import type { User } from "./userHandler";
import ffmpeg from "fluent-ffmpeg";
import type { MessageDto } from "../workers/workerDto";
import axios from "axios";
import path from "path";
import type { AutomaticSpeechRecognitionOutput } from "@huggingface/transformers";
import { getObjectUrl,isResourceExisting } from "../utils/s3";

const pineConeClient = await getPineconeClient();
let convoClient = (await getMongoClient()).collection("conversation");
let podcastClient = (await getMongoClient()).collection("podcast");

export const presignedUrlSchema ={
    body: t.Object({
        convoId: t.String(),
        url: t.String()
    })
}

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

    let namespaceKey = `${user.id}-${convo?._id}`;
    let message ={
        role:"user",
        content:`Uploaded ${file.name}`,
    };

    await Promise.all([
        pineConeClient.namespace(namespaceKey).upsert(vectors),
        convoClient.updateOne({
            _id: convo?._id
        },
            {
                $push: {
                    messages: message
                } as any,
                $set: {
                    updatedAt: new Date().toISOString()
                }
            }
        )
    ])


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
    const tempDir = path.join(__dirname, '../processor-ms/temp/multimedia');


    let isConvoValid = await findOrUpsertConversation(convoId, user);
    if (isConvoValid?.messages.length > 250) throw new Error("Conversation length exceeded");
    
    await mkdir(tempDir, { recursive: true });

    const timestamp = Date.now()
    let tempFilename = `temp_${timestamp}_${file.name}`
    let tempPath = `${tempDir}/${tempFilename}`;
    let chunks!: MessageDto;
    
    
    try {
        await Bun.write(tempPath, file);
        
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
            
            
            const res = await axios.post("http://localhost:5000/api/v1/processor",{
                filepath:proccessedAudioPath,
                type : "audio"
            });

            
            chunks = res.data; 
            
            await unlink(proccessedAudioPath);

        }
        if (file.type.includes("video")) {

            const proccessedVideoPath=`${tempDir}/temp_${timestamp}_proccessed.wav`;
           
            await new Promise<void>((res, rej) => {
                ffmpeg(tempPath)
                    .audioCodec('pcm_s16le')
                    .audioFrequency(16000)
                    .audioChannels(1)
                    .format('wav')
                    .noVideo()
                    .save(proccessedVideoPath)
                    .on("end", () => {
                        res();
                    })
                    .on("error", (err) => {
                        rej(err);
                    });
            })


            const res = await axios.post("http://localhost:5000/api/v1/processor",{
                filepath:proccessedVideoPath,
                type : "video"
            });

            chunks = res.data; 

        }
    }
    catch (err:any) {
        
        await unlink(tempPath);
        throw err;
    }

    await unlink(tempPath);


    if (!chunks.data) throw new Error("Error occured while processing file, Please upload again");



    let chunkEmbeddings: {
        content: string,
        embeddings: number[]
    }[] = [];

    let chunkyBoi = chunks.data as AutomaticSpeechRecognitionOutput;


    chunkEmbeddings = await Promise.all(
        chunkyBoi.chunks!.map(async (chunk) => ({
            content: `chunk: ${chunk.text} at timestamp:${chunk.timestamp}`,
            embeddings: await embedder(chunk.text)
        }))
    )


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

    let namespaceKey = `${user.id}-${convo?._id}`;

    let message ={
        role:"user",
        content:`Uploaded ${file.name}`,
    };

    await Promise.all([
        pineConeClient.namespace(namespaceKey).upsert(vectors),
        convoClient.updateOne({
            _id: convo?._id
        },
            {
                $push: {
                    messages: message
                } as any,
                $set: {
                    updatedAt: new Date().toISOString()
                }
            }
        )
    ])

    return {
        message: "Multimedia parsed sucessfully",
        sucess: true,
        convoId: convo?._id
    }


}

export const generateNewPresignedUrl = async({ body}:{

    body: typeof presignedUrlSchema.body,

}) => {

    const {convoId, url} = body

    const podcast = await podcastClient.findOne({
        convoId
    });

    if(!podcast) throw new Error("Invalid conversation");

    if(podcast.url !== url) throw new Error("Invalid Url");

    if(!await isResourceExisting(podcast.path)) throw new Error("Invalid resource");

    const newObjectUrl = getObjectUrl(url);

    await podcastClient.updateOne({
        convoId
    },{
        url: newObjectUrl,
        updatedAt: new Date().toISOString()
    })

    return {
        url: newObjectUrl
    }
   

}