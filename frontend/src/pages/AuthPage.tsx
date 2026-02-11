import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup';

export function AuthPage() {
  const { signIn, signUp } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    setIsSubmitting(true);

    if (mode === 'login') {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : authError.message);
      }
    } else {
      const { error: authError } = await signUp(email, password);
      if (authError) {
        setError(authError.message);
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">SignalPulse</h1>
          <p className="text-sm text-text-secondary mt-1">AI 주식 분석 시스템</p>
        </div>

        {/* Tab */}
        <div className="flex rounded-lg bg-bg-secondary border border-border p-1 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-md transition-all',
              mode === 'login'
                ? 'bg-white text-accent-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            로그인
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-md transition-all',
              mode === 'signup'
                ? 'bg-white text-accent-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            회원가입
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm
                text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary
                transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? '최소 6자 이상' : '비밀번호 입력'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm
                text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary
                transition-all"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm
                  text-text-primary placeholder:text-text-tertiary
                  focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary
                  transition-all"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-medium transition-all',
              'bg-accent-primary text-white hover:bg-accent-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting
              ? (mode === 'login' ? '로그인 중...' : '가입 중...')
              : (mode === 'login' ? '로그인' : '회원가입')
            }
          </button>
        </form>
      </div>
    </div>
  );
}
