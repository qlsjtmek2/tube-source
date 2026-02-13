'use client';

import { useState } from 'react';
import * as PortOne from '@portone/browser-sdk/v2';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

export function UpgradeButton({ userEmail }: { userEmail: string }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);

    try {
      const paymentId = `payment-${crypto.randomUUID()}`;
      
      // 1. 포트원 결제창 호출
      const payment = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!, // 포트원 상점 아이디
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!, // 포트원 채널 키 (카카오/네이버페이 설정된 채널)
        paymentId: paymentId,
        orderName: 'TubeSource PRO 구독 (1개월)',
        totalAmount: 9900,
        currency: 'CURRENCY_KRW',
        payMethod: 'EASY_PAY', // 간편결제 우선 (카카오, 네이버 등 선택 가능)
        customer: {
            email: userEmail,
        },
        redirectUrl: `${window.location.origin}/payment/callback`, // 모바일 환경용
      });

      // 결제창이 닫혔을 때 (V2 SDK는 프로미스로 처리됨)
      if (payment?.code != null) {
        // 오류 발생
        alert(`결제 실패: ${payment.message}`);
        return;
      }

      // 2. 서버에 결제 검증 요청
      const response = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: paymentId }),
      });

      const result = await response.json();

      if (result.success) {
        alert('PRO 등급으로 업그레이드 되었습니다! 다시 로그인하거나 페이지를 새로고침 하세요.');
        window.location.reload();
      } else {
        alert(`검증 실패: ${result.error || result.message}`);
      }
    } catch (e) {
      console.error('Payment Error:', e);
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleUpgrade} 
      disabled={isProcessing}
      className="w-full bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 text-white font-bold"
    >
      {isProcessing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      PRO 등급으로 업그레이드
    </Button>
  );
}
