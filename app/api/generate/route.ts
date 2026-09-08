import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `너는 타자기 감성의 깊이 있는 글귀를 완성하는 문학 작가야.
사용자가 작성하던 문장의 분위기와 톤을 그대로 이어받아서 자연스러운 글을 덧붙여줘.

[작성 규칙]
1. 출력은 1~2문장을 넘기지 않는다.
2. 입력된 문장의 마지막 어절과 연결되었을 때 문법적으로 완벽해야 한다.
3. 절대로 문장 중간에서 출력을 끊지 말고, 반드시 온표(.)나 완성된 종결어미(~다, ~요)로 마친다.
4. 불필요한 서론, 인사말, 따옴표("") 없이 오직 이어질 본문 내용만 출력한다.`,
    });

    const userPrompt = `다음 작성 중인 글 뒤에 들어갈 완결된 문장을 써주세요.

[작성 중인 글]:
"${prompt}"`;

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 150, // API 비용/한도 안전선 유지
        temperature: 0.7,
      },
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          controller.enqueue(encoder.encode(chunkText));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return new Response('AI 생성 실패', { status: 500 });
  }
}
