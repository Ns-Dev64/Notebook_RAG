import { Elysia } from 'elysia'
import { uploaderSchema,uploader, multiMediaUploader, multiMediaSchema } from '../handlers/fileHandlerAndChunker';
import { authMiddleware } from '../middleware/authMiddleware';

const fileRouter=new Elysia({prefix:"/file"});

fileRouter
.use(authMiddleware)
.post("/",uploader,uploaderSchema)
.post("/mm",multiMediaUploader,multiMediaSchema);

export default fileRouter