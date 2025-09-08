import express from "express";
import cors from "cors";
import MultiMediaProcessor from "../workers/master.ts";
import fs from "fs/promises"
import type { PrcoessorDto } from "../workers/workerDto.ts";

const app = express();

app.use(cors({
    origin:["http://localhost:5001"]
}))

app.use(express.json())


app.post("/api/v1/processor",async(req ,res)=>{

    const { filepath, type} = req.body;

    if(!filepath || !type){

        return res.send("Invalid body");

    }

    try{

        const processor = new MultiMediaProcessor();

        const workerId =  processor.createWorker();

        const processorPayload: PrcoessorDto = {
            workerId,
            type,
            filePath:filepath
        }

        const result = await processor.processMedia(processorPayload);

        if(!result.success){
            throw new Error(result.message);
        }

        return res.send(result);

    }
    catch(err){

        res.status(500);
        return res.send(err);

    }

})

app.post("/api/v1/tts", async (req, res) => {

    const content =req.body.content as string;

    try {

        const processor = new MultiMediaProcessor();

        const workerId =  processor.createWorker();

        const processorPayload: PrcoessorDto = {
            workerId,
            type: "podcast",
            content
        }

        const buffer = await processor.processMedia(processorPayload);

       const bufferData = buffer.data as Buffer;

        return res.send({
            audio: Array.from(bufferData)
        });

    }
    catch (err) {

        console.log(err);

        res.status(500);
        res.send(err);

    }


})


app.listen(5000,()=>{
    console.log("listening on port ",5000)
})