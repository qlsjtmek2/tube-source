import { GoogleGenerativeAI } from "@google/generative-ai";
import { EnrichedVideo, YouTubeComment } from './youtube';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// AI 분석 결과 타입
export interface AnalysisResult {
  hook: string;
  structure: string;
  target: string;
  insights: string[];
  community_needs: string; 
}

export interface ContextAnalysisResult {
  commonalities: string;
  strategies: string;
  insights: string[];
  action_plan: string;
}

// 분석된 영상 저장 타입
export interface AnalyzedVideo {
  type?: 'single' | 'context'; // 기본값은 single
  videoId: string; // context일 경우 reportId
  title: string;
  channelTitle: string; // context일 경우 "N개의 영상 분석" 등
  channelId: string; // context일 경우 빈 값 또는 식별자
  thumbnail: string; // context일 경우 대표 이미지 또는 빈 값
  viewCount: number; // context일 경우 합계 또는 평균
  likeCount: number;
  commentCount: number;
  subscriberCount: number;
  engagementRate: number;
  performanceRatio: number;
  analysisResult: AnalysisResult | ContextAnalysisResult;
  analyzedAt: string; // ISO timestamp
}

export async function analyzeContextStrategy(videos: EnrichedVideo[], userPrompt?: string) {
  const modelName = "gemini-3-flash-preview";
  console.log(`[AI Context Analysis] Starting with model: ${modelName}`);

  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: `당신은 유튜브 빅데이터 분석가이자 채널 컨설턴트입니다. 
단편적인 데이터 분석을 넘어, 수집된 영상들 사이의 **숨겨진 연결고리(Hidden Connections)**와 **성공 패턴(Success Patterns)**을 발굴하는 것이 주 임무입니다.
단순한 요약이 아니라, 사용자가 즉시 실행 가능한 구체적이고 전략적인 액션 플랜을 제시하십시오.`
  });

  const videosData = videos.map((v, idx) => `
    [영상 ${idx + 1}]
    - 제목: ${v.title}
    - 채널: ${v.channelTitle}
    - 성과: 조회수 ${v.viewCount.toLocaleString()}, 좋아요 ${v.likeCount.toLocaleString()}, 댓글 ${v.commentCount.toLocaleString()}, 성과도 ${v.performanceRatio}%
    - 게시일: ${v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : '정보 없음'}
    - 설명: ${v.description?.slice(0, 150).replace(/\n/g, ' ')}...
  `).join('\n');

  const prompt = `
    """
    [Context]
    사용자는 벤치마킹을 위해 다음 ${videos.length}개의 유튜브 영상을 수집했습니다.
    이 데이터셋을 통해 자신의 채널을 성장시킬 수 있는 통찰을 얻고자 합니다.
    ${userPrompt ? `사용자 추가 요청사항: "${userPrompt}"` : ""}
    """

    [분석 대상 데이터]
    ${videosData}

    [Task Instructions]
    위 영상들을 종합적으로 분석하여 다음 4가지 핵심 영역에 대한 전략 리포트를 JSON 형식으로 작성하십시오.

    1. 공통된 성공 요인 (commonalities):
       - **Why it worked:** 이 영상들이 공통적으로 시청자를 끌어당긴 '본질적인 매력'은 무엇입니까?
       - 썸네일/제목 패턴, 초반 후킹 요소, 소재의 선정 기준 등 관통하는 공통점을 구체적으로 분석하십시오.

    2. 트렌드 및 전략 분석 (strategies):
       - **Market Fit:** 현재 이 카테고리에서 반응이 오는 콘텐츠 포맷이나 키워드는 무엇입니까?
       - 시청 지속 시간을 늘리기 위한 편집 호흡, 자막 스타일, 스토리텔링 방식 등을 기술적인 관점에서 분석하십시오.

    3. 핵심 인사이트 (insights):
       - **Deep Dive:** 데이터를 통해 발견한, 남들은 쉽게 지나칠 수 있는 날카로운 통찰 3~5가지를 나열하십시오.
       - "재미있어야 한다" 같은 뻔한 말이 아닌, "특정 감정선을 자극해야 한다"와 같은 깊이 있는 분석을 요구합니다.

    4. 내 채널 적용 액션 플랜 (action_plan):
       - **Next Step:** 당장 다음 영상 기획에 적용할 수 있는 구체적인 가이드를 제시하십시오.
       - "A방식으로 썸네일을 만들고, B구조로 인트로를 구성하라"와 같이 지시형으로 작성하십시오.

    [Output Format]
    오직 유효한 JSON 포맷으로만 응답하십시오. (Markdown 코드 블록 제외)
    {
      "commonalities": "...",
      "strategies": "...",
      "insights": ["...", "...", "..."],
      "action_plan": "..."
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

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

export async function analyzeVideoStrategy(videoData: EnrichedVideo, comments: YouTubeComment[] = []) {
  // CRITICAL: MUST use gemini-3-flash-preview as confirmed by project requirements
  const modelName = "gemini-3-flash-preview";
  console.log(`[AI Analysis] Starting analysis with model: ${modelName}`);

  // Use Gemini 3 Flash (Preview) - DO NOT CHANGE THIS MODEL NAME
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: `당신은 세계적인 유튜브 콘텐츠 전략가이자 행동 심리학 전문가입니다. 
단순히 현상을 나열하는 분석이 아니라, **'Why (왜 터졌는가?)'**에 집중하여 성공의 근본 원인을 파헤칩니다.
시청자의 무의식적 욕구(Desire), 심리적 트리거(Trigger), 그리고 커뮤니티의 감정 흐름(Sentiment)을 연결하여 통찰력 있는 분석을 제공하십시오.`
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
    commentsSection = comments.map(c => `- ${c.authorName}: ${c.text} (👍 좋아요 ${c.likeCount})`).join('\n');
  }

  const prompt = `
    다음 유튜브 영상의 데이터를 바탕으로, 성공 요인을 심층 분석하십시오.

    [영상 메타데이터]
    - 제목: ${videoData.title}
    - 채널명: ${videoData.channelTitle}
    - 게시일: ${videoData.publishedAt ? new Date(videoData.publishedAt).toLocaleDateString() : '정보 없음'}
    - 성과: 조회수 ${videoData.viewCount.toLocaleString()}, 좋아요 ${videoData.likeCount.toLocaleString()}, 댓글 ${videoData.commentCount.toLocaleString()}, 구독자 ${videoData.subscriberCount.toLocaleString()}
    - 설명: ${videoData.description}

    [커뮤니티 반응 (베스트 댓글 Top ${comments.length})]
    ${commentsSection}

    ${subtitleSection}

    [분석 가이드라인 (Socratic Method)]
    다음 5가지 항목에 대해 깊이 있는 분석을 수행하고, JSON 형식으로 답변하십시오.

    1. 핵심 후킹 포인트 (hook):
       - **Question:** 왜 시청자는 이 영상을 클릭할 수밖에 없었는가? 썸네일과 제목이 건드린 본능적 호기심이나 결핍은 무엇인가?
       - **Analysis:** 초반 30초 내에 시청자를 붙잡아둔 구체적인 연출이나 멘트는 무엇이며, 그것이 왜 효과적이었는지 심리학적 관점에서 설명하십시오.

    2. 콘텐츠 구성 전략 (structure):
       - **Question:** 시청 지속 시간을 유지하기 위해 어떤 서사 구조를 사용했는가?
       - **Analysis:** 기승전결, 반전, 텐션의 조절 등 시청자가 이탈하지 못하게 만든 설계 장치를 분석하십시오.

    3. 타겟 오디언스 (target):
       - **Question:** 이 영상은 누구의 어떤 욕망을 대변하는가?
       - **Analysis:** 단순 인구통계학적 타겟이 아니라, 그들이 가진 상황적 고민, 심리적 상태, 숨겨진 니즈를 정의하십시오.

    4. 커뮤니티 니즈 및 반응 (community_needs):
       - **Question:** 댓글창에서 시청자들은 어떤 포인트에 열광하거나 공감하는가? 그들이 진정으로 원했던 것은 무엇인가?
       - **Analysis:** 베스트 댓글을 통해 형성된 여론을 분석하고, 시청자들이 영상에서 해소한 감정(대리만족, 위로, 정보 습득 등)이나 충족된 니즈를 파악하십시오.

    5. 벤치마킹 인사이트 (insights):
       - **Question:** 내가 비슷한 영상을 만든다면 반드시 적용해야 할 3가지 법칙은 무엇인가?
       - **Analysis:** 추상적인 조언이 아닌, 당장 적용 가능한 구체적인 액션 아이템 3가지를 도출하십시오.

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
