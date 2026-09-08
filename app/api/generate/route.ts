import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    let promptText = '';
    try {
      const body = await req.json();
      promptText = body.prompt || body.text || body.content || (typeof body === 'string' ? body : '');
    } catch (e) {
      promptText = await req.text().catch(() => '');
    }

    const textToProcess = promptText.trim() !== '' 
      ? promptText 
      : '어느 조용한 밤, 타자기 소리만 방 안을 가득 채웠다.';

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // gemini-1.5-flash 대신 gemini-2.0-flash 또는 gemini-1.5-flash-latest 사용
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const formattedPrompt = `다음은 사용자가 아날로그 타자기로 작성 중인 글입니다. 이어서 자연스럽고 감성적인 문장 1~2개를 작성해 주세요.\n\n작성 중인 글:\n${textToProcess}`;

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: formattedPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
        } catch (err) {
          console.error('Stream processing error:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Gemini API Error Details:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to generate text', details: error?.message || String(error) }, 
      { status: 500 }
    );
  }
}
