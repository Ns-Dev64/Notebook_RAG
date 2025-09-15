import { t } from "elysia";
import { getPineconeClient, getMongoClient } from "../db/init";
import { findOrUpsertConversation } from "../db/operations";
import { embedder } from "../utils/embedder";
import { aiChat } from "../utils/gemini";
import type { User } from "./userHandler";
import { ObjectId } from "mongodb";
import { cleanAIResponse } from "../utils/helper";
import axios from "axios";
import { uploadToS3 } from "../utils/s3";

const pineConeClient = await getPineconeClient();
const convoClient = (await getMongoClient()).collection("conversation");
const podcastClient = (await getMongoClient()).collection("podcast");
const diagramClient = (await getMongoClient()).collection("diagram");

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
        content: chat,
        timestamp: new Date().toISOString()
    };

    const dBResults = {
        role: "system",
        content: `Relevant context from DB:\n${constructQuery}`,
        timestamp: new Date().toISOString()
    };

    let query: any = {};

    if (Array.isArray(conversation)) {
        query.conversation = conversation;
    }

    query.userQuery = userChat;
    query.dBResults = dBResults;

    const response = await aiChat(query);

    let formattedResponse = cleanAIResponse(response!);

    let messages = [
        userChat,
        {
            role: "assistant",
            content: formattedResponse,
            timestamp: new Date().toISOString()
        },
    ];

    await convoClient.updateOne(
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


export const createPodcast = async ({ body, user, set }: {
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

    let preQuery = `${chat}, content (Podcast generation): `

    const finalQuery = `${preQuery}\n${constructQuery}`;


    const response = await aiChat(finalQuery);

    const buffer = await tts(response as string);

    const { presignedUrl, path } = await uploadToS3(buffer!, user.id);

    let message = {
        role: "user",
        content: chat,
        timestamp: new Date().toISOString()
    }

    await Promise.all([
        convoClient.updateOne({
            _id: new ObjectId(convoId as string),
            userId: user.id
        }, {
            $push: {
                messages: message
            } as any,
        }),
        podcastClient.insertOne({
            userId: user.id,
            convoId,
            url: presignedUrl,
            path: path,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
    ]);


    return {
        audioUrl: presignedUrl,
        path
    };

}

export const generateDiagram = async ({ body, user }: {

    body: typeof chatSchema.body,
    user: User

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

    let preQuery = `${chat}, content(Mermaid generation): `

    const finalQuery = `${preQuery}\n${constructQuery}\n Conversation:${conversation}`;
       

    const response = await aiChat(finalQuery);

    let formattedResponse = response!.trim();
    
    formattedResponse = formattedResponse.replace('mermaid', '').replaceAll('```', '').trim();

    let message = {
        role: "user",
        content: chat,
        timestamp: new Date().toISOString()
    };

    await Promise.all([
        diagramClient.insertOne({
            userId: user.id,
            convoId,
            rawSyntax: formattedResponse,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }),
        convoClient.updateOne({
            _id: new ObjectId(convoId as string),
            userId: user.id
        }, {
            $push: {
                messages: message
            } as any,
            $set: {
                updatedAt: new Date().toISOString()
            }
        })
    ]);

    return { rawData: formattedResponse }

}


async function tts(content: string) {

    try {

        const res = await axios.post("http://localhost:5000/api/v1/tts", {
            content
        });

        const buffer = Buffer.from(res.data.audio);

        if (!buffer) throw new Error("Error occured while processing script.");

        return buffer;

    }
    catch (err: any) {

        console.log(err.data);
    }


}