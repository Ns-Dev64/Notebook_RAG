import { Elysia } from 'elysia'
import { chatWithAi, chatSchema } from '../handlers/aiHandler';
import { authMiddleware } from '../middleware/authMiddleware';
import { createPodcast } from '../handlers/aiHandler';

const aiRouter = new Elysia({ prefix: "/ai" });

aiRouter
    .use(authMiddleware)
    .post("/chat", chatWithAi, chatSchema)
    .post("/audio-podcast", createPodcast,chatSchema);
export default aiRouter;
