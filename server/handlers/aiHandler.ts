import { t } from "elysia";
import { getPineconeClient, getMongoClient } from "../db/init";
import { findOrUpsertConversation } from "../db/operations";
import { embedder } from "../utils/embedder";
import { aiChat } from "../utils/gemini";
import type { User } from "./userHandler";
import { ObjectId } from "mongodb";
import { cleanAIResponse } from "../utils/helper";

const pineConeClient = await getPineconeClient();
const mongoClient = (await getMongoClient()).collection("conversation");


export const chatSchema = {
    body: t.Object({
        chat: t.String(),
        convoId: t.Optional(t.String())
    })
}


export const chatWithAi = async ({ body, user }: {
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
            } as any
        }
    );

    return {
        message: "chat generated",
        convoId: convo?._id,
        data: formattedResponse
    };

};

