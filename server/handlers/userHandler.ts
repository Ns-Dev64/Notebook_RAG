import {t} from "elysia";
import { getMongoClient } from "../db/init";
import Jwt from "jsonwebtoken"

let mongoClient=(await getMongoClient()).collection("users");

export interface User{
    email:string,
    id:string,
}

export const registerSchema={
     body: t.Object({
    userName: t.String(),
    email: t.String(),
    password: t.String(),
  })
}

export const loginSchema={
    body: t.Object({
    identifier: t.String(),
    password: t.String(),
  })
}


export const registerHandler=async({body}:{
    body:typeof registerSchema.body
})=>{

    const {userName,password,email}=body;

    let userPayload={
        userName,
        email,
        password:await Bun.password.hash(String(password)),
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
    }


    const user=await mongoClient.insertOne(userPayload);

    if(!user) throw new Error("Error occured while creating user");

    return {
        message:"user created successfully",
        user:user.insertedId
    }
}

export const loginHandler=async({body}:{
    body: typeof loginSchema.body
})=>{

    const {identifier,password}=body;

    const user=await mongoClient.findOne({
        $or:[
            {email:identifier},
            {userName:identifier}
        ]
    });

    if(!user) throw new Error("Invalid user");

    if(!await Bun.password.verify(String(password),user.password)) throw new Error("Invalid password");

    const token=Jwt.sign({
        email:user.email,
        id:user._id.toString()
    },Bun.env.JWT_SECRET!,{
        expiresIn:'2h'
    })

    return {
        token,
        message:"User logged in sucessfully"
    }
    
}

