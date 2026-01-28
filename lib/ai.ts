import { GoogleGenerativeAI } from "@google/generative-ai";
import { EnrichedVideo, YouTubeComment } from './youtube';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// AI 분석 결과 타입
export interface AnalysisResult {
  hook: string;
  structure: string;
  target: string;
  community_needs: string;
  // 중립적 분석 항목
  strengths: string[];      // 이론에 근거한 강점
  weaknesses: string[];     // 개선점 및 단점
  insights: string[];       // 벤치마킹 인사이트
  // 실행 가이드
  search_keywords: string[];  // 유사 소스 검색 키워드
  editing_tips: string[];     // 편집 방식 추천
}

export interface ContextAnalysisResult {
  commonalities: string;
  strategies: string;
  // 중립적 분석 항목
  strengths: string[];        // 공통된 강점 (이론 근거)
  weaknesses: string[];       // 공통된 약점 및 개선 여지
  insights: string[];         // 핵심 인사이트
  // 실행 가이드
  action_plan: string;
  search_keywords: string[];  // 유사 소스 검색 키워드
  editing_tips: string[];     // 편집 방식 추천
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
  duration?: string;
  transcript?: string;
  caption?: boolean;
  creativeCommons?: boolean;
  analysisResult: AnalysisResult | ContextAnalysisResult;
  analyzedAt: string; // ISO timestamp
}

export async function analyzeContextStrategy(videos: EnrichedVideo[], userPrompt?: string) {
  const modelName = "gemini-3-flash-preview";
  console.log(`[AI Context Analysis] Starting with model: ${modelName}`);

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: `당신은 중립적이고 객관적인 유튜브 콘텐츠 분석가입니다.

## 분석 원칙
1. **중립성**: 데이터셋의 장점과 한계를 균형 있게 분석합니다.
2. **이론적 근거**: 패턴 분석 시 검증된 이론(심리학, 마케팅, 미디어학)을 참조합니다.
3. **실용성**: 추상적 조언이 아닌, 즉시 적용 가능한 구체적 가이드를 제공합니다.
4. **비판적 사고**: 공통 패턴이 항상 좋은 것은 아닙니다. 개선 여지도 함께 분석합니다.

## 참조 이론 프레임워크
- 심리학: AIDA 모델, 호기심 갭, 손실 회피, 사회적 증거, 밴드왜건 효과
- 콘텐츠 전략: 블루오션 전략, 니치 마케팅, 콘텐츠 차별화
- 유튜브 알고리즘: CTR, 시청 지속률(AVD), 세션 타임, 추천 알고리즘`
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
다음 ${videos.length}개의 유튜브 영상을 **중립적 관점**에서 종합 분석하십시오.
성공 패턴만 보지 말고, 공통된 약점이나 개선 여지도 객관적으로 평가해 주세요.
${userPrompt ? `\n**사용자 추가 요청**: "${userPrompt}"` : ""}

---
## 분석 대상 데이터
${videosData}

---
## 분석 항목

### 1. 공통 패턴 분석 (commonalities)
- 이 영상들을 관통하는 공통 요소는? (제목/썸네일 패턴, 소재 선정 기준, 후킹 방식)
- 공통 패턴이 작동하는 이유를 관련 이론과 함께 설명

### 2. 트렌드 및 전략 분석 (strategies)
- 현재 이 카테고리에서 반응이 오는 콘텐츠 포맷/키워드는?
- 편집 호흡, 자막 스타일, 스토리텔링 방식의 공통점은?

### 3. 공통 강점 (strengths) - 이론적 근거 포함
- 이 영상들이 공통적으로 잘하고 있는 점 2~3가지
- 각 강점이 효과적인 이유 (심리학/마케팅 이론 참조)

### 4. 공통 약점 및 개선 여지 (weaknesses) - 건설적 비평
- 대부분의 영상에서 발견되는 한계점이나 놓친 기회 2~3가지
- 차별화할 수 있는 블루오션 포인트 제안

### 5. 핵심 인사이트 (insights)
- 데이터에서 발견한 비직관적이거나 날카로운 통찰 3~5가지
- "재미있어야 한다" 같은 뻔한 말 X, 구체적이고 실행 가능한 인사이트

### 6. 액션 플랜 (action_plan)
- 다음 영상 기획에 즉시 적용할 구체적 가이드
- "A방식으로 썸네일을 만들고, B구조로 인트로를 구성하라" 형식으로 작성

### 7. 유사 소스 검색 키워드 (search_keywords)
- 이 유형의 영상/소재를 더 찾으려면 검색할 키워드 3~5개
- 한글/영어 키워드 조합, 틈새 키워드 포함

### 8. 편집 방식 추천 (editing_tips)
- 이 카테고리에서 효과적인 편집 기법 3~4가지
- 컷 편집 빈도, 자막 스타일, BGM 장르, 효과음 사용, 화면 전환 등 구체적으로

---
## 응답 형식 (JSON Only)
Markdown 코드 블록 없이, 순수 JSON만 반환하십시오.

{
  "commonalities": "공통 패턴 분석...",
  "strategies": "트렌드 및 전략 분석...",
  "strengths": ["강점 1 (이론적 근거)", "강점 2 (이론적 근거)"],
  "weaknesses": ["약점/개선 여지 1", "약점/개선 여지 2"],
  "insights": ["인사이트 1", "인사이트 2", "인사이트 3"],
  "action_plan": "구체적인 액션 플랜...",
  "search_keywords": ["키워드1", "키워드2", "keyword3"],
  "editing_tips": ["편집 팁 1", "편집 팁 2", "편집 팁 3"]
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
    systemInstruction: `당신은 중립적이고 객관적인 유튜브 콘텐츠 분석가입니다.

## 분석 원칙
1. **중립성**: 장점과 단점을 균형 있게 분석합니다. 과대 평가나 과소 평가를 피합니다.
2. **이론적 근거**: 모든 분석은 검증된 이론(심리학, 마케팅, 미디어학)에 기반합니다.
3. **실용성**: 추상적 조언이 아닌, 즉시 적용 가능한 구체적 가이드를 제공합니다.

## 참조 이론 프레임워크
- 심리학: AIDA 모델, 호기심 갭(Curiosity Gap), 손실 회피(Loss Aversion), 사회적 증거(Social Proof)
- 스토리텔링: 3막 구조, 영웅의 여정, 텐션 곡선(Tension Curve)
- 유튜브 알고리즘: CTR, 시청 지속률(AVD), 세션 타임`
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
다음 유튜브 영상을 **중립적 관점**에서 심층 분석하십시오.
장점만 나열하지 말고, 개선 가능한 부분도 객관적으로 평가해 주세요.

---
## 영상 메타데이터
- 제목: ${videoData.title}
- 채널명: ${videoData.channelTitle}
- 게시일: ${videoData.publishedAt ? new Date(videoData.publishedAt).toLocaleDateString() : '정보 없음'}
- 성과: 조회수 ${videoData.viewCount.toLocaleString()}, 좋아요 ${videoData.likeCount.toLocaleString()}, 댓글 ${videoData.commentCount.toLocaleString()}, 구독자 ${videoData.subscriberCount.toLocaleString()}
- 설명: ${videoData.description}

## 커뮤니티 반응 (베스트 댓글 Top ${comments.length})
${commentsSection}
${subtitleSection}

---
## 분석 항목

### 1. 핵심 후킹 포인트 (hook)
- 제목/썸네일이 자극하는 심리적 트리거는? (호기심 갭, 손실 회피, 사회적 증거 등)
- 초반 30초의 시청자 유지 전략은?

### 2. 콘텐츠 구성 전략 (structure)
- 사용된 서사 구조는? (3막 구조, 기승전결, 텐션 곡선 등)
- 시청 지속률 유지를 위한 설계 장치는?

### 3. 타겟 오디언스 (target)
- 이 영상이 겨냥하는 시청자의 심리적 상태, 상황적 고민, 숨겨진 니즈는?
- 단순 인구통계가 아닌 페르소나 관점에서 분석

### 4. 커뮤니티 니즈 및 반응 (community_needs)
- 댓글에서 드러나는 시청자들의 핵심 반응 포인트는?
- 영상이 충족시킨 감정적 니즈(대리만족, 위로, 정보 습득 등)는?

### 5. 강점 분석 (strengths) - 이론적 근거 포함
- 이 영상이 잘한 점 2~3가지
- 각 강점이 효과적인 이유를 관련 이론과 함께 설명

### 6. 약점 및 개선점 (weaknesses) - 건설적 비평
- 개선하면 더 좋았을 부분 2~3가지
- 구체적인 개선 방안 제시 (단순 비판 X)

### 7. 벤치마킹 인사이트 (insights)
- 이 영상에서 배울 수 있는 핵심 교훈 3가지
- 추상적 조언이 아닌 구체적 액션 아이템

### 8. 유사 소스 검색 키워드 (search_keywords)
- 이런 유형의 영상/소재를 더 찾고 싶다면 유튜브에서 검색할 키워드 3~5개
- 한글/영어 키워드 조합 추천

### 9. 편집 방식 추천 (editing_tips)
- 이 영상 스타일을 참고할 때 적용할 편집 기법 3~4가지
- 컷 편집, 자막 스타일, BGM 사용, 효과음, 화면 전환 등 구체적으로

---
## 응답 형식 (JSON Only)
Markdown 코드 블록 없이, 순수 JSON만 반환하십시오.

{
  "hook": "후킹 포인트 분석...",
  "structure": "콘텐츠 구성 분석...",
  "target": "타겟 오디언스 분석...",
  "community_needs": "커뮤니티 니즈 분석...",
  "strengths": ["강점 1 (이론적 근거)", "강점 2 (이론적 근거)"],
  "weaknesses": ["개선점 1 + 개선 방안", "개선점 2 + 개선 방안"],
  "insights": ["인사이트 1", "인사이트 2", "인사이트 3"],
  "search_keywords": ["키워드1", "키워드2", "keyword3"],
  "editing_tips": ["편집 팁 1", "편집 팁 2", "편집 팁 3"]
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
