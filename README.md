# Video Source Collector (TubeSource)

YouTube 및 TikTok 영상 분석 및 다운로드를 위한 올인원 크리에이터 도구입니다.

## ✨ 주요 기능

### 1. 영상 검색 및 분석
- **심층 검색**: YouTube 영상을 키워드, 기간, 조회수, 구독자 대비 성과도 등 다양한 필터로 검색할 수 있습니다.
- **채널 정밀 분석**: 특정 채널의 모든 영상을 수집하여 성과도가 높은 영상만 필터링하거나, 최신/오래된 순으로 정렬해 분석할 수 있습니다.
- **AI 분석**: Gemini 3.0 Flash 모델을 활용하여 영상의 **후킹 포인트, 구성 전략, 타겟 오디언스, 커뮤니티 반응**을 심층 분석합니다.
- **맥락 분석 (Context Analysis)**: 여러 개의 영상을 선택하여 공통된 성공 요인과 시장 트렌드를 도출하는 종합 리포트를 생성합니다.

### 2. 영상 다운로드
- **다중 플랫폼 지원**: **YouTube** 뿐만 아니라 **TikTok** 영상 링크도 지원합니다.
- **포맷 선택**: MP4(고화질 영상) 및 MP3(오디오) 포맷으로 다운로드할 수 있습니다.
- **실시간 진행률**: 다운로드 진행 상황을 실시간으로 확인할 수 있습니다.

### 3. 데이터 관리 및 리포트
- **분석 히스토리**: 분석된 모든 영상은 로컬 데이터베이스에 저장되어 언제든 다시 열람할 수 있습니다.
- **필터링**: 채널별, 분석 유형별(개별/맥락)로 결과를 필터링하여 볼 수 있습니다.
- **PDF 내보내기**: 분석 결과를 깔끔한 PDF 리포트로 저장하여 팀원과 공유하거나 보관할 수 있습니다.

## 🚀 설치 및 실행 방법

이 프로젝트는 [Next.js](https://nextjs.org/)를 기반으로 만들어졌습니다.

### 필수 요구 사항
- Node.js 18.17.0 이상
- Python 3.x (yt-dlp 실행용)
- `yt-dlp` 설치 필요 (`pip install yt-dlp` 또는 `brew install yt-dlp`)

### 1. 프로젝트 클론
```bash
git clone https://github.com/your-username/video-source-collector.git
cd video-source-collector
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 키를 추가하세요:

```env
# YouTube Data API v3 키
YOUTUBE_API_KEY=your_youtube_api_key_here

# Google Gemini API 키
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 🛠️ 기술 스택
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, Shadcn/UI
- **AI**: Google Gemini API (gemini-3-flash-preview)
- **Media**: yt-dlp (Video Downloading)

## ⚠️ 주의사항
- **API Quota**: YouTube Data API는 일일 할당량 제한이 있습니다. 대량 수집 시 쿼터가 빠르게 소진될 수 있습니다.
- **저작권**: 다운로드한 영상의 저작권은 원저작자에게 있으며, 개인적 용도나 공정 이용 범위 내에서만 사용해야 합니다.

## 📄 라이선스
MIT License