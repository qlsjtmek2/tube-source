import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 정보 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호된 경로 설정 (메인 페이지 등)
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isApiAuthPage = request.nextUrl.pathname.startsWith('/api/auth');

  if (!user && !isAuthPage && !isApiAuthPage) {
    // 유저가 없고 로그인 페이지가 아니면 로그인으로 리다이렉트
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    // 이미 로그인한 유저가 로그인 페이지에 접근하면 메인으로
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청에 대해 미들웨어 실행:
     * - api/ (인증 관련 API 제외)
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico, public/ 내 파일들
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
