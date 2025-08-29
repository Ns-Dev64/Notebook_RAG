import { Elysia } from 'elysia'
import { chatWithAi,chatSchema } from '../handlers/aiHandler';
import { authMiddleware } from '../middleware/authMiddleware';

const aiRouter=new Elysia({prefix:"/ai"});

aiRouter
.use(authMiddleware)
.post("/chat",chatWithAi,chatSchema)

export default aiRouter;
