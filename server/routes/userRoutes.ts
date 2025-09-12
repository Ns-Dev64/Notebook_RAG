import { Elysia } from 'elysia'
import { registerHandler,loginHandler,registerSchema,loginSchema, getUserConversations, deleteConversation, getConvoPodcasts, status, getConvoMessages, getConverastionDiagrams } from '../handlers/userHandler';
import { authMiddleware } from '../middleware/authMiddleware';

const userRouter=new Elysia({prefix:"/user"});

userRouter.put("/",loginHandler,loginSchema);
userRouter.post("/",registerHandler,registerSchema);

userRouter.use(authMiddleware).get("/convo",getUserConversations);
userRouter.use(authMiddleware).delete("/convo/:convoId",deleteConversation);
userRouter.use(authMiddleware).get("/convo/podcast/:convoId", getConvoPodcasts);
userRouter.use(authMiddleware).get("/status",status);
userRouter.use(authMiddleware).get("/convo/messages/:convoId",getConvoMessages);
userRouter.use(authMiddleware).get("/convo/diagram/:convoId",getConverastionDiagrams);
export default userRouter