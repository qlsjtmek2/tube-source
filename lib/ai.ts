import { GoogleGenerativeAI } from "@google/generative-ai";
import { EnrichedVideo, YouTubeComment } from './youtube';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// AI 분석 결과 타입
export interface AnalysisResult {
  hook: string;
  structure: string;
  target: string;
  insights: string[];
  community_needs: string; // New field for community analysis
}

// 분석된 영상 저장 타입
export interface AnalyzedVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  subscriberCount: number;
  engagementRate: number;
  performanceRatio: number;
  analysisResult: AnalysisResult;
  analyzedAt: string; // ISO timestamp
}

export async function analyzeVideoStrategy(videoData: EnrichedVideo, comments: YouTubeComment[] = []) {
  const modelName = "gemini-2.0-flash-exp";
  console.log(`[AI Analysis] Starting analysis with model: ${modelName}`);

  // Use Gemini 2.0 Flash (latest fast model)
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: `당신은 세계적인 유튜브 콘텐츠 전략가이자 행동 심리학 전문가입니다. 
단순히 현상을 나열하는 분석이 아니라, '왜(Why)?'라는 소크라테스식 질문을 던지며 성공의 근본 원인을 파헤칩니다.
시청자의 무의식적 욕구, 심리적 트리거, 그리고 커뮤니티의 감정 흐름을 연결하여 통찰력 있는 분석을 제공하십시오.`
  });

  // 자막 텍스트 준비 (50,000자 제한)
  let subtitleSection = '';
  if (videoData.subtitleText) {
    const maxLength = 50000; // ~12,500 토큰
    const truncatedSubtitle = videoData.subtitleText.length > maxLength
      ? videoData.subtitleText.slice(0, maxLength) + '\n\n... (자막이 너무 길어 일부만 표시)'
      : videoData.subtitleText;

    subtitleSection = `
    [영상 자막 (전체 내용)]
    ${truncatedSubtitle}
    `;
  }

  // 댓글 데이터 준비
  let commentsSection = '댓글 정보 없음';
  if (comments.length > 0) {
    commentsSection = comments.map(c => `- ${c.authorName}: ${c.text} (👍 ${c.likeCount})`).join('\n');
  }

  const prompt = `
    다음 유튜브 영상의 데이터를 바탕으로, 성공 요인을 심층 분석하십시오.

    [영상 메타데이터]
    - 제목: ${videoData.title}
    - 채널명: ${videoData.channelTitle}
    - 성과: 조회수 ${videoData.viewCount.toLocaleString()}, 좋아요 ${videoData.likeCount.toLocaleString()}, 구독자 ${videoData.subscriberCount.toLocaleString()}
    - 설명: ${videoData.description}

    [커뮤니티 반응 (베스트 댓글 Top ${comments.length})]
    ${commentsSection}

    ${subtitleSection}

    [분석 가이드라인 (Socratic Method)]
    다음 5가지 항목에 대해 깊이 있는 분석을 수행하고, JSON 형식으로 답변하십시오.

    1. 핵심 후킹 포인트 (hook):
       - 질문: 왜 시청자는 이 영상을 클릭할 수밖에 없었는가? 썸네일과 제목이 건드린 본능적 호기심이나 결핍은 무엇인가?
       - 분석: 초반 30초 내에 시청자를 붙잡아둔 구체적인 연출이나 멘트는 무엇이며, 그것이 왜 효과적이었는지 심리학적 관점에서 설명하십시오.

    2. 콘텐츠 구성 전략 (structure):
       - 질문: 시청 지속 시간을 유지하기 위해 어떤 서사 구조를 사용했는가?
       - 분석: 기승전결, 반전, 텐션의 조절 등 시청자가 이탈하지 못하게 만든 설계 장치를 분석하십시오.

    3. 타겟 오디언스 (target):
       - 질문: 이 영상은 누구의 어떤 욕망을 대변하는가?
       - 분석: 단순 인구통계학적 타겟이 아니라, 그들이 가진 상황적 고민, 심리적 상태, 숨겨진 니즈를 정의하십시오.

    4. 커뮤니티 니즈 및 반응 (community_needs):
       - 질문: 댓글창에서 시청자들은 어떤 포인트에 열광하거나 공감하는가? 그들이 진정으로 원했던 것은 무엇인가?
       - 분석: 베스트 댓글을 통해 형성된 여론을 분석하고, 시청자들이 영상에서 해소한 감정(대리만족, 위로, 정보 습득 등)이나 충족된 니즈를 파악하십시오.

    5. 벤치마킹 인사이트 (insights):
       - 질문: 내가 비슷한 영상을 만든다면 반드시 적용해야 할 3가지 법칙은 무엇인가?
       - 분석: 추상적인 조언이 아닌, 당장 적용 가능한 구체적인 액션 아이템 3가지를 도출하십시오.

    [응답 형식 (JSON Only)]
    {
      "hook": "심층 분석 내용...",
      "structure": "심층 분석 내용...",
      "target": "심층 분석 내용...",
      "community_needs": "댓글 기반 커뮤니티 니즈 분석...",
      "insights": ["인사이트 1", "인사이트 2", "인사이트 3"]
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Extract JSON from response (sometimes Gemini wraps it in ```json)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return { error: "Failed to parse AI response" };
    }
  }
  
  return { error: "Failed to parse AI response", raw: text };
}
