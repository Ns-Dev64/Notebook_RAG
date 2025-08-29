import { getMongoClient } from "./init";
import { ObjectId } from "mongodb";
import type{User} from "../handlers/userHandler"

const mongoClient=(await getMongoClient()).collection("conversation");

export async function findOrUpsertConversation(convoId:string,user:User) {

     let convo = await mongoClient.findOneAndUpdate({
            _id: new ObjectId(convoId)
        },
            {
                $setOnInsert: {
                    userId: user.id,
                    messages: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            }, {
            upsert: true,
            returnDocument: 'after'
        }
        )

    return convo;

}


