// DO NOT RUN THIS WORKER USING BUN 

import type{ MessageDto } from "./workerDto.ts";
import { Worker } from "node:worker_threads";

type multiMediaConfig ={
    timeOutinMins:number,
    maxWorkers:number,
}

class MultiMediaProcessor{

    private timeOutinMins:number;
    private maxWorkers:number;
    private workerMap:Map<string,Worker> = new Map();



    constructor(config?:multiMediaConfig){

        this.timeOutinMins = config?.timeOutinMins || 5;
        this.maxWorkers = config?.maxWorkers || 5;

    }

    isFull(){

        if(this.workerMap.size >= this.maxWorkers) {
            return true;
        }

        return false;

    }

    isEmpty(){

        if(this.workerMap.size === 0){
            return true;
        }

        return false;

    }

    createWorker() {

        if(this.isFull())  throw new Error("Worker pool exhausted!");
    
        const worker = new Worker(new URL('./multiMediaWorker.ts', import.meta.url));


        const workerId = `${Date.now()}_${worker.threadId}`;

        this.workerMap.set(workerId,worker);

        return workerId;

    }

    timeoutExhaustedWorker(workerId:string){

        setTimeout(()=>{
            this.terminateWorker(workerId);

        },this.timeOutinMins * 60 * 1000);

    };

    terminateWorker(workerId:string){

        const worker = this.workerMap.get(workerId);

        if(worker){
            worker.terminate();
            console.log(`Worker terminated`,workerId);
        }

    };

    terminateAllWorkers(){
        
        if(!this.isEmpty()){

            const workers = this.workerMap.values();

            workers.forEach((worker)=> worker.terminate());

            console.log("All workers terminated");

        }

    }

    async processMedia(workerId:string,filepath:string, type:string){
        
        return new Promise<MessageDto>((res,rej)=>{

            const worker = this.workerMap.get(workerId);

            
            if(!worker) {
                return rej("Invalid worker Id");
            }
            

            const payload = {
                filePath:filepath,
                type
            };
            
            worker.postMessage(payload);
            
            worker.on("message",(event:MessageDto)=>{

                return res(event);
            })

            worker.on("error",(event)=>{

                return rej(event)
            })



        })

    }

}

export default MultiMediaProcessor