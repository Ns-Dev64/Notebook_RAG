import express from "express";
import cors from "cors";
import MultiMediaProcessor from "../workers/master.ts";

const app = express();

app.use(cors({
    origin:["http://localhost:5001"]
}))



app.post("/api/v1/processor",async(req ,res)=>{

    const { filepath, type} = req.body;

    if(!filepath || !type){

        return res.send("Invalid body");

    }

    try{

        const processor = new MultiMediaProcessor();

        const workerId =  processor.createWorker();

        const result = await processor.processMedia(workerId, filepath, type);

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




app.listen(5000,()=>{
    console.log("listening on port ",5000)
})