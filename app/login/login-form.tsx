'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Youtube } from 'lucide-react';

const SUPABASE_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
  'User already registered': '이미 가입된 이메일입니다.',
  'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
  'Anonymous sign-ins are disabled': '이메일과 비밀번호를 입력해주세요.',
  'Signup requires a valid password': '유효한 비밀번호를 입력해주세요.',
};

function translateError(message: string): string {
  return SUPABASE_ERROR_MAP[message] || message;
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(translateError(error.message));
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(translateError(error.message));
    } else {
      setSuccess('인증 메일을 발송했습니다. 이메일을 확인해주세요.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-2">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
            <Youtube className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-2">TubeSource</h1>
          <p className="text-sm text-muted-foreground">
            이메일과 비밀번호를 입력하여 로그인하세요
          </p>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-3 rounded-md">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-3 rounded-md">
                {success}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              style={{ backgroundColor: '#dc2626', color: 'white' }}
              disabled={loading}
            >
              {loading ? '처리 중...' : '로그인'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pb-8">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          <div className="w-full space-y-2">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={handleSignUp}
              disabled={loading}
            >
              새 계정 만들기
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              입력하신 이메일로 인증 메일이 발송됩니다.
            </p>
          </div>

        </CardFooter>
      </Card>
    </div>
  );
}
