import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { logger } from '@/lib/logger';
import { PostSchema } from '@/lib/tools/schemas';
import { buildPostPrompt } from '@/lib/tools/post-generator';
import { checkRateLimit, recordGenerationToResponse } from '@/lib/tools/rate-limiter';

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const rateLimited = await checkRateLimit();
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Create a free account for unlimited use.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    log.info('api.request.start', { method: 'POST', path: '/api/tools/post', platform: parsed.data.platform });

    const model = new ChatOpenAI({
      apiKey: process.env.API_KEY,
      configuration: { baseURL: process.env.BASE_URL },
      modelName: process.env.MODEL ?? 'qwen3.6-plus',
      temperature: 0.7,
    });

    const prompt = buildPostPrompt(parsed.data.topic, parsed.data.platform, parsed.data.tone);
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' ? response.content : String(response.content);

    // Parse JSON - strip markdown code blocks
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      log.error('api.post.parse_failed', { content: content.slice(0, 200) });
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const nextResponse = NextResponse.json({ data: result }, { status: 200 });
    await recordGenerationToResponse(nextResponse);

    log.info('api.request.success', { requestId });
    return nextResponse;
  } catch (error) {
    log.error('api.request.error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
