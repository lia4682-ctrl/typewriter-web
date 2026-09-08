import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    // 프론트엔드에서 빈 값이 넘어올 경우를 대비한 기본 텍스트
    const contentPrompt = prompt && prompt.trim() !== '' ? prompt : '어느 조용한 밤, 타자기 소리만 방 안을 가득 채웠다.';

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
      },
    });

    const userPrompt = `다음은 사용자가 아날로그 타자기로 작성 중인 글입니다. 이어서 자연스럽고 감성적인 문장 1~2개를 작성해 주세요.\n\n작성 중인 글:\n${contentPrompt}`;

    const result = await model.generateContentStream(userPrompt);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate text' }), { status: 500 });
  }
}
