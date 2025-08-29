import { Elysia } from 'elysia'
import { getPineconeClient, getMongoClient } from './db/init';
import userRouter from './routes/userRoutes';
import fileRouter from "./routes/fileRouter";
import aiRouter from './routes/aiRouter';

Bun.env.NODE_ENV = Bun.env.ENV_TYPE || "DEV";

const port = parseInt(Bun.env.PORT || '5001')

const app = new Elysia({prefix:"/api/v1"});


app.use(userRouter);
app.use(fileRouter);
app.use(aiRouter);

app.onError(({set,code,error})=>{


    set.status=500;

    return {
        message:"Internal Server Error",
        error:`${code} : ${error}`
    }

});

    (async () => {

        try{
            await getPineconeClient();
            await getMongoClient();
        console.log("Db connected");
        }
        catch(err){
            console.error("Error occured while connecting to db",err)
        }

    })();





app.listen(port)

console.log(`Server running on port ${port}`);
