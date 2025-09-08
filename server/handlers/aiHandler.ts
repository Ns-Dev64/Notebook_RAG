import { t } from "elysia";
import { getPineconeClient, getMongoClient } from "../db/init";
import { findOrUpsertConversation } from "../db/operations";
import { embedder } from "../utils/embedder";
import { aiChat } from "../utils/gemini";
import type { User } from "./userHandler";
import { ObjectId } from "mongodb";
import { cleanAIResponse } from "../utils/helper";
import axios from "axios";
import { deflateSync, inflateSync } from "bun";

const pineConeClient = await getPineconeClient();
const mongoClient = (await getMongoClient()).collection("conversation");
const podcastClient = (await getMongoClient()).collection("podcast");

export const chatSchema = {
    body: t.Object({
        chat: t.String(),
        convoId: t.Optional(t.String())
    })
}



export const chatWithAi = async ({ body, user, set }: {
    body: typeof chatSchema.body,
    user: User,
    set: any
}) => {

    const { chat, convoId } = body;

    let convo = await findOrUpsertConversation(convoId, user);

    if (convo?.messages.length > 250) throw new Error("Conversation length exceeded");

    const vectorEmbedding = await embedder(String(chat));

    let namespaceKey = `${user.id}-${convo?._id}`;

    const results = await pineConeClient.namespace(namespaceKey).query({
        topK: 10,
        vector: vectorEmbedding,
        includeMetadata: true
    });

    let constructQuery = "";
    results.matches.forEach((match) => {
        const content = match?.metadata?.content as string;
        constructQuery += `${content}\n`;
    });


    let conversation = convo?.messages.length > 0 ? convo?.messages : null;

    const userChat = {
        role: "user",
        content: chat
    };

    const dBResults = {
        role: "system",
        content: `Relevant context from DB:\n${constructQuery}`
    };


    let query: any= {};

    if (Array.isArray(conversation)) {
        query.conversation=conversation;
    } 

    query.userQuery=userChat;
    query.dBResults=dBResults;

    const response = await aiChat(query);

    let formattedResponse = cleanAIResponse(response!);

    let messages = [
        userChat,
        {
            role: "assistant", 
            content: formattedResponse
        },
    ];

    await mongoClient.updateOne(
        {
            _id: new ObjectId(convo?._id)
        },
        {
            $push: {
                messages: {
                    $each: messages
                }
            } as any,

            $set: {
                updatedAt: new Date().toISOString()
            }
        }
    );

    return {
        message: "chat generated",
        convoId: convo?._id,
        data: formattedResponse
    };

};


export const createPodcast = async({body,user,set}:{
    body : typeof chatSchema.body,
    user : User,
    set: any
})=>{

    const {chat,convoId} = body;

    let convo = await findOrUpsertConversation(convoId, user);

    if (convo?.messages.length > 250) throw new Error("Conversation length exceeded");

    const vectorEmbedding = await embedder(String(chat));

    let namespaceKey = `${user.id}-${convo?._id}`;

    const results = await pineConeClient.namespace(namespaceKey).query({
        topK: 10,
        vector: vectorEmbedding,
        includeMetadata: true
    });

    let constructQuery = "";

    results.matches.forEach((match) => {
        const content = match?.metadata?.content as string;
        constructQuery += `${content}\n`;
    });

    let preQuery = `Generate a podcast-style narration in a natural, conversational tone. Write it as continuous spoken content, not as a script with stage directions. The narration should be professional yet engaging, suitable for direct use in text-to-speech to produce an audio podcast. Return the response strictly as a single string, for example:

        "Welcome to the podcast ....". You are giving a podcast to a single person so make sure its inclined towards one individual`

    const finalQuery = `${preQuery}\n${constructQuery}`;
    
    
    const response = await aiChat(finalQuery);

    const buffer = await tts(response as string);

    const deflatedBuffer = deflateSync(new Uint8Array(buffer!));

    await podcastClient.insertOne({
        userId:user.id,
        convoId,
        podcastBuffer : deflatedBuffer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    const inflated = inflateSync(deflatedBuffer);

    const file = new File([inflated], "track.wav", { type: "audio/wav" });


return new Response(file, {
    headers: {
        "Content-Disposition": "inline; filename=track.wav", 
        "Content-Type": "audio/wav", 
    }
});

}

async function tts(content:string) {

    try {

        const res = await axios.post("http://localhost:5000/api/v1/tts", {
            content
        });

        const buffer = Buffer.from(res.data.audio);

        if(!buffer) throw new Error("Error occured while processing script.");

        return buffer;

    }
    catch (err:any) {

        console.log(err.data);
    }

    
}