# Supabase Database Schema

이 문서는 **Video Source Collector** 프로젝트를 위한 데이터베이스 테이블 설계 및 보안 정책(RLS)을 담고 있습니다. Supabase SQL Editor에서 아래 쿼리를 순서대로 실행하세요.

---

## 1. 테이블 생성 (Tables)

### 유저 프로필 및 구독 정보 (`profiles`)
유저의 구독 등급과 일일 사용량을 관리합니다.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'FREE' CHECK (subscription_tier IN ('FREE', 'PRO')),
  daily_analysis_count INTEGER DEFAULT 0,
  last_analysis_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 사용자별 관심 채널 (`saved_channels`)
사용자가 저장한 유튜브 채널 목록입니다.

```sql
CREATE TABLE saved_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  thumbnail TEXT,
  category TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, channel_id)
);
```

### AI 분석 결과 (`analysis_results`)
단일 영상 분석 및 맥락 분석 결과를 저장합니다.

```sql
CREATE TABLE analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single', 'context')),
  video_id TEXT NOT NULL, -- single일 땐 videoId, context일 땐 reportId
  title TEXT NOT NULL,
  channel_title TEXT,
  channel_id TEXT,
  thumbnail TEXT,
  metrics JSONB, -- viewCount, likeCount, subscriberCount 등
  analysis_data JSONB NOT NULL, -- Gemini 분석 결과 (Markdown 등)
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. 자동 프로필 생성 트리거 (Trigger)
사용자가 Supabase Auth를 통해 회원가입할 때 자동으로 `profiles` 테이블에 레코드를 생성합니다.

```sql
-- 트리거 함수 정의
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 설정
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 3. 보안 설정 (Row Level Security)
모든 데이터는 주인인 유저만 접근할 수 있도록 보안 정책을 설정합니다.

```sql
-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Profiles 정책: 본인 정보 조회 및 업데이트만 가능
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Saved Channels 정책: 본인 채널만 관리 가능
CREATE POLICY "Users can manage own channels" ON saved_channels 
  FOR ALL USING (auth.uid() = user_id);

-- Analysis Results 정책: 본인 분석 결과만 관리 가능
CREATE POLICY "Users can manage own analysis" ON analysis_results 
  FOR ALL USING (auth.uid() = user_id);
```
