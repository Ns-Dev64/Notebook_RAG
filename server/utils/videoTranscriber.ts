import ffmpeg from "fluent-ffmpeg"

export const videoTranscriber = async (filepath: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const audioChunks: Buffer[] = [];

        ffmpeg(filepath)
            .audioCodec('pcm_s16le')
            .audioFrequency(16000)
            .audioChannels(1)
            .format('wav')
            .noVideo()
            .pipe()
            .on("data", (chunk: Buffer) => audioChunks.push(chunk))
            .on("finish", () => {  
                const buffer = Buffer.concat(audioChunks);
                resolve(buffer);
            })
            .on("error", (err) => {
                reject(err);
            });
    });
};