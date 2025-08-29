import { Elysia } from 'elysia'
import { registerHandler,loginHandler,registerSchema,loginSchema } from '../handlers/userHandler';

const userRouter=new Elysia({prefix:"/user"});

userRouter.put("/",loginHandler,loginSchema);
userRouter.post("/",registerHandler,registerSchema);

export default userRouter