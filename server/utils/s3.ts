import { S3Client } from "bun";

const FOLDER = "/podcasts";

const bucket = new S3Client({
    bucket: Bun.env.S3_BUCKET_NAME,
    accessKeyId: Bun.env.AWS_S3_ACCESS_KEY_ID,
    region: Bun.env.AWS_REGION,
    secretAccessKey: Bun.env.AWS_S3_SECRET_KEY
});

export async function uploadToS3(fileBuffer: Buffer, keyId: string): Promise<{ presignedUrl:string, path:string }> {

    const key = `${Date.now()}-${keyId}`;

    const path = `${FOLDER}/user-${key}`;

    await bucket.write(path, fileBuffer);

    const presignedUrl = bucket.presign(path, { expiresIn: 7200 });

    return {
        presignedUrl,
        path
    };
};

export  function getObjectUrl(path:string): string {

    const presignedUrl = bucket.presign(path, {expiresIn: 7200});
    
    return presignedUrl;
    
};

export async function deletefromS3(paths:string[]): Promise<boolean>{

    await Promise.all(
        paths.map(async(path)=>{
            await bucket.delete(path);
        })
    )

    return true;

}


export async function isResourceExisting(path:string): Promise<boolean> {

    return await bucket.exists(path);

}
