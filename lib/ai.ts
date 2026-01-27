import { GoogleGenerativeAI } from "@google/generative-ai";
import { EnrichedVideo } from './youtube';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeVideoStrategy(videoData: EnrichedVideo) {
  const modelName = "gemini-3-flash-preview";
  console.log(`[AI Analysis] Starting analysis with model: ${modelName}`);

  // Use Gemini 3 Flash (Preview)
  const model = genAI.getGenerativeModel({ model: modelName });

  // 자막 텍스트 준비 (50,000자 제한)
  let subtitleSection = '';
  if (videoData.subtitleText) {
    const maxLength = 50000; // ~12,500 토큰
    const truncatedSubtitle = videoData.subtitleText.length > maxLength
      ? videoData.subtitleText.slice(0, maxLength) + '\n\n... (자막이 너무 길어 일부만 표시)'
      : videoData.subtitleText;

    subtitleSection = `
    영상 자막 (전체 내용):
    ${truncatedSubtitle}
    `;
  }

  const prompt = `
    당신은 유튜브 콘텐츠 전략 전문가입니다. 다음 영상의 정보를 바탕으로 성공 전략을 분석하여 한국어로 답변해 주세요.

    영상 제목: ${videoData.title}
    채널명: ${videoData.channelTitle}
    조회수: ${videoData.viewCount}
    좋아요 수: ${videoData.likeCount}
    구독자 수: ${videoData.subscriberCount}
    영상 설명: ${videoData.description}
    ${subtitleSection}

    분석 항목:
    1. 핵심 후킹 포인트 (Hook): 시청자가 이 영상을 클릭하고 초반에 이탈하지 않게 만드는 요소는 무엇인가?
    2. 콘텐츠 구조 (Structure): 영상이 어떤 단계로 구성되어 시청 지속시간을 확보하는가?
    3. 타겟 오디언스 (Target): 이 영상은 구체적으로 어떤 사람들에게 어필하고 있는가?
    4. 벤치마킹 인사이트 (Insight): 이 영상에서 배울 수 있는 핵심 전략 3가지는 무엇인가?

    ${videoData.subtitleText ? '자막 전체 내용을 참고하여 영상의 실제 흐름과 내용을 정확히 분석해 주세요.' : ''}

    응답 형식: JSON으로 출력해 주세요. (keys: hook, structure, target, insights[])
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Extract JSON from response (sometimes Gemini wraps it in ```json)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return { error: "Failed to parse AI response", raw: text };
}
