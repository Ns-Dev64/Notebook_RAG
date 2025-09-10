import { t } from "elysia";
import { getMongoClient } from "../db/init";
import Jwt from "jsonwebtoken"
import { ObjectId } from "mongodb";
import { deletefromS3 } from "../utils/s3";
import { getPineconeClient } from "../db/init";

const pineConeClient = await getPineconeClient();
let userClient = (await getMongoClient()).collection("users");
let convoClient = (await getMongoClient()).collection("conversation");
let podcastClient = (await getMongoClient()).collection("podcast");
export interface User {
    email: string,
    id: string,
}

export const registerSchema = {
    body: t.Object({
        userName: t.String(),
        email: t.String(),
        password: t.String(),
    })
}

export const loginSchema = {
    body: t.Object({
        identifier: t.String(),
        password: t.String(),
    })
}


export const registerHandler = async ({ body }: {
    body: typeof registerSchema.body
}) => {

    const { userName, password, email } = body;

    let userPayload = {
        userName,
        email,
        password: await Bun.password.hash(String(password)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }


    const user = await userClient.insertOne(userPayload);

    if (!user) throw new Error("Error occured while creating user");

    return {
        message: "user created successfully",
        user,
    }
}

export const loginHandler = async ({ body }: {
    body: typeof loginSchema.body
}) => {

    const { identifier, password } = body;

    const user = await userClient.findOne({
        $or: [
            { email: identifier },
            { userName: identifier }
        ]
    });

    if (!user) throw new Error("Invalid user");

    if (!await Bun.password.verify(String(password), user.password)) throw new Error("Invalid password");

    const token = Jwt.sign({
        email: user.email,
        id: user._id.toString()
    }, Bun.env.JWT_SECRET!, {
        expiresIn: '2h'
    })

    return {
        user: { ...user, password: "" },
        token,
        message: "User logged in sucessfully"
    }

}


export const getUserConversations = async ({ user }: {
    user: User
}) => {

    const conversations = await convoClient.find(
        {
            userId: user.id
        }
    ).toArray();

    return conversations.length > 0 ? conversations : [];

}

export const getConvoPodcasts = async ({ params, user }: {
    params: {
        convoId: string,
    },
    user: User
}) => {

    const { convoId } = params;

    const podcasts = await podcastClient.find({
        convoId,
    }).toArray();

    return podcasts.length > 0 ? podcasts : [];

}

export const status = async ({ user }: {
    user: User
}) => {

    return {
        message: "User logged in",
        data: user
    }

}

export const deleteConversation = async ({ params, user }: {
    params: {
        convoId: string,
    },
    user: User
}) => {

    const convoId = params.convoId;

    const convo = await convoClient.findOne({
        _id: new ObjectId(convoId)
    })

    if (!convo) throw new Error("Invalid conversation");

    if (convo.userId !== user.id) throw new Error("Invalid user");

    let key = `${user.id}-${convoId}`;

    const docs = await podcastClient.find(
        { convoId },
        { projection: { path: 1, _id: 0 } }
    ).toArray();

    const paths:string[] = docs.map(doc => doc.path);

    await Promise.all([
        convoClient.deleteOne({
            _id: new ObjectId(convoId)
        }),
        podcastClient.deleteMany({
            convoId
        }),
        deletefromS3(paths),
        pineConeClient.deleteNamespace(key)
    ]);


    return {
        message: "Conversation deleted sucessfully",
    };

}