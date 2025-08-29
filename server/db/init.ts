import { Index, Pinecone } from '@pinecone-database/pinecone';
import { Db, MongoClient } from 'mongodb';


const pineconeApiKey=Bun.env.PINECONE_API_KEY!;
const mongoUri=Bun.env.MONGO_URI!;
const pineconeDocIndex=Bun.env.PINECONE_DOC_INDEX!;
const pineconeDocHost=Bun.env.PINECONE_DOC_HOST!;
const db=Bun.env.MONGO_DB!;


let pineconeClient:Index | null=null;
let mongoClient:Db | null =null;

export async function getPineconeClient() {

    if(pineconeClient) return pineconeClient;

    const pc=new Pinecone({apiKey:pineconeApiKey});

    pineconeClient= pc.index(pineconeDocIndex,pineconeDocHost);

    return pineconeClient;
}

export async function getMongoClient() {
    
    if(mongoClient) return mongoClient;

    const client=await MongoClient.connect(mongoUri);

    mongoClient=client.db(db);
    
    return mongoClient;

}