import { OpenAIEmbeddings } from '@langchain/openai';

let embeddingsModel: OpenAIEmbeddings | null = null;

export function getEmbeddingsModel(): OpenAIEmbeddings {
    if (!embeddingsModel) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        
        embeddingsModel = new OpenAIEmbeddings({
            openAIApiKey: apiKey,
            modelName: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
            dimensions: 1536,
        });
    }
    return embeddingsModel;
}

/**
 * Generate an embedding vector for the given text.
 * Returns a 1536-dimensional float array.
 */
export async function embedText(text: string): Promise<number[]> {
    const model = getEmbeddingsModel();
    const vector = await model.embedQuery(text);
    return vector;
}
