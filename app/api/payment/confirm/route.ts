import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
    }

    // 1. 포트원 API를 통한 결제 내역 단건 조회 (서버사이드 검증)
    const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
    
    const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`,
      },
    });

    if (!response.ok) {
      throw new Error('포트원 결제 조회에 실패했습니다.');
    }

    const paymentData = await response.json();

    // 2. 결제 상태 확인 (PAID 상태인지 확인)
    if (paymentData.status === 'PAID') {
      // 3. 결제 금액이 내가 설정한 금액과 맞는지 검증 (예: 9900원)
      // const EXPECTED_AMOUNT = 9900;
      // if (paymentData.amount.total !== EXPECTED_AMOUNT) { throw new Error('결제 금액 위변조 감지'); }

      // 4. 유저 등급 업데이트 (PRO로 상향)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: 'PRO',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('유저 등급 업데이트에 실패했습니다.');
      }

      return NextResponse.json({ success: true, tier: 'PRO' });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `결제 상태가 올바르지 않습니다: ${paymentData.status}` 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Payment Confirmation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
