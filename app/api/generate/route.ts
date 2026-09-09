import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // 모델 식별자에 'models/' 접두사를 명시하여 404 에러 방지
    const model = genAI.getGenerativeModel({
      model: 'models/gemini-3.6-flash',
      systemInstruction: `너는 타자기 감성의 문학 작가야. 반드시 아래 규칙을 지켜라.
[절대 규칙]
1. 분석, 평가, 번호 매기기, 목차 생성, 설명 등의 메타 답변을 절대 금지합니다.
2. 오직 이어질 본문 문장만 출력하세요. (예: "끝없는 반복 속에서 비로소 한 줄의 빛을 발견하듯 말이다.")
3. 입력된 문장의 언어와 동일한 언어로만 작성할 것.
4. 길이는 1~2문장 이내로 제한하며, 온점이나 명확한 종결어미로 끝낼 것.`,
    });

    const userPrompt = `아래 문장의 마지막 단어에 이어질 다음 내용을 [절대 규칙]에 맞춰 오직 본문 문장만 작성해 줘.

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
