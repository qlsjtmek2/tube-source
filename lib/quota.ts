import { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionTier = 'FREE' | 'PRO';

export interface QuotaConfig {
  maxDailyAnalysis: number;
  canUseBulkAnalysis: boolean;
  canUseContextAnalysis: boolean;
  maxSearchResults: number;
}

const QUOTA_LIMITS: Record<SubscriptionTier, QuotaConfig> = {
  FREE: {
    maxDailyAnalysis: 5,
    canUseBulkAnalysis: false,
    canUseContextAnalysis: false,
    maxSearchResults: 20,
  },
  PRO: {
    maxDailyAnalysis: 500, // 사실상 무제한
    canUseBulkAnalysis: true,
    canUseContextAnalysis: true,
    maxSearchResults: 500,
  },
};

/**
 * 유저의 쿼터 상태를 확인하고 분석 횟수를 1 증가시킵니다.
 */
export async function checkAndIncrementQuota(userId: string, supabase: SupabaseClient): Promise<{ allowed: boolean; reason?: string }> {
  // 유저 프로필 조회
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('Quota check error: Profile not found', error);
    return { allowed: false, reason: '프로필을 찾을 수 없습니다.' };
  }

  const tier = (profile.subscription_tier || 'FREE') as SubscriptionTier;
  const config = QUOTA_LIMITS[tier];

  // 일일 초기화 로직 (마지막 리셋 날짜와 오늘 날짜 비교)
  const lastReset = new Date(profile.last_analysis_reset);
  const now = new Date();
  const isDifferentDay = lastReset.getUTCDate() !== now.getUTCDate() || 
                        lastReset.getUTCMonth() !== now.getUTCMonth() || 
                        lastReset.getUTCFullYear() !== now.getUTCFullYear();

  let currentCount = profile.daily_analysis_count;

  if (isDifferentDay) {
    // 날짜가 바뀌었으면 카운트 리셋
    currentCount = 0;
    await supabase
      .from('profiles')
      .update({ 
        daily_analysis_count: 0, 
        last_analysis_reset: now.toISOString() 
      })
      .eq('id', userId);
  }

  // 쿼터 초과 확인
  if (currentCount >= config.maxDailyAnalysis) {
    return { allowed: false, reason: `일일 분석 한도(${config.maxDailyAnalysis}회)를 초과했습니다. PRO 등급으로 업그레이드하세요!` };
  }

  // 카운트 증가
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ daily_analysis_count: currentCount + 1 })
    .eq('id', userId);

  if (updateError) {
    console.error('Quota update error:', updateError);
    return { allowed: false, reason: '사용량 업데이트 중 오류가 발생했습니다.' };
  }

  return { allowed: true };
}

export function getQuotaConfig(tier: SubscriptionTier): QuotaConfig {
  return QUOTA_LIMITS[tier] || QUOTA_LIMITS.FREE;
}
