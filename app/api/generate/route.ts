import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const model = genAI.getGenerativeModel({
      model: 'models/gemini-3.6-flash',
      systemInstruction: `당신은 문학 작가입니다. 사용자가 입력한 문장 끝에 자연스럽게 이어질 내용을 작성하는 도구로만 동작합니다.
[절대 규칙]
1. 분석, 평가, 번호 매기기, 목차 생성, 설명 등의 메타 답변을 절대 금지합니다.
2. 오직 이어질 본문 문장만 출력하세요. (절대 따옴표나 마크다운 기호 사용 금지)
3. 입력된 문장의 언어와 동일한 언어로만 작성할 것.
4. 길이는 1~2문장 이내로 제한하며, 반드시 온점이나 명확한 종결어미로 끝낼 것.`,
    });

    const userPrompt = `다음 문장의 마지막에 자연스럽게 이어질 본문 내용만 작성해주세요. 다른 설명이나 번호는 절대 붙이지 마세요.

입력 문장: ${prompt}`;

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.6, // 엉뚱한 답변을 줄이기 위해 온도를 약간 낮춤
      },
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
        }

        // 🧹 [후처리 로직]: 모델이 지시를 어기고 번호나 메타 텍스트를 붙였을 경우 강제로 정제
        let cleanedText = fullText
          .replace(/^(\d+\.|[#-]|\*)\s*/gm, '') // 불필요한 번호나 마크다운 기호 제거
          .replace(/^(결과:|답변:|출력:)\s*/gi, '')
          .trim();

        controller.enqueue(encoder.encode(cleanedText));
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);

    // 💡 무료 한도(429) 초과 시 프론트엔드가 알아볼 수 있도록 명확한 메시지 전달
    if (error?.status === 429 || error?.message?.includes('Quota exceeded')) {
      return new Response('오늘의 무료 AI 사용량을 모두 소모했습니다. 내일 다시 이용해주세요.', { status: 429 });
    }

    return new Response('AI 생성 실패', { status: 500 });
  }
}
```[cite: 2]

### 무료 사용 팁
* **스트리밍 구조 변경:** 기존에는 청크가 들어오는 대로 실시간 밀어 넣었지만, 모델이 종종 헛소리를 먼저 뱉는 성향이 있어 **전체 내용을 다 받은 뒤 정제(후처리)해서 한 번에 내려주도록** 살짝 변경했습니다. 
* **429 에러 처리:** 무료 한도 20번이 끝나면 앱이 멈추는 대신 "오늘의 무료 AI 사용량을 모두 소모했습니다"라는 안내를 띄우도록 처리해 두어 디버깅이 편해집니다.
