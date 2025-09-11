import { Elysia } from 'elysia'
import { uploaderSchema, uploader, multiMediaUploader, multiMediaSchema, generateNewPresignedUrl, presignedUrlSchema } from '../handlers/fileHandlerAndChunker';
import { authMiddleware } from '../middleware/authMiddleware';

const fileRouter = new Elysia({ prefix: "/file" });

fileRouter
    .use(authMiddleware)
    .post("/", uploader, uploaderSchema)
    .post("/multimedia", multiMediaUploader, multiMediaSchema)
    .post("/refresh-presigned", generateNewPresignedUrl, presignedUrlSchema)
export default fileRouter;