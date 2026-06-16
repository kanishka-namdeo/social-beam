import { ChatOpenAI } from '@langchain/openai';

export function createLLM(options?: { temperature?: number; model?: string }) {
  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? '',
    configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
    modelName: options?.model ?? process.env.MODEL ?? 'qwen3.6-plus',
    temperature: options?.temperature ?? 0.7,
  });
}

export function createFastLLM(options?: { temperature?: number }) {
  return createLLM({
    model: process.env.FAST_MODEL ?? process.env.MODEL ?? 'qwen3.6-plus',
    temperature: options?.temperature ?? 0.7,
  });
}
