import { FeatureExtractionPipeline, pipeline } from '@huggingface/transformers';

let tokenizer: FeatureExtractionPipeline | null = null;

async function getEmbedder() {

    if (tokenizer) return tokenizer;

    tokenizer = await pipeline('feature-extraction', 'Xenova/jina-embeddings-v2-small-en',
        { dtype: "fp16" } 
    );

    await tokenizer("warmup");
    return tokenizer
}



export async function embedder(content: string) {

    const tokenizer = await getEmbedder();

    const tensor = await tokenizer(content,{
        pooling:"mean"
    });

    return await tensor.tolist()[0]

}