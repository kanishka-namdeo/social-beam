'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Spinner, EyeIcon, EyeSlashIcon, Sparkle, WarningCircle } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !EMAIL_REGEX.test(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        toast.success('Welcome back!', { description: 'Signed in successfully' });
        const res = await fetch('/api/onboarding/status');
        if (res.ok) {
          const { completed } = await res.json() as { completed: boolean };
          router.push(completed ? '/dashboard' : '/onboarding');
        } else {
          router.push('/onboarding');
        }
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex w-full max-w-md flex-col">
      {/* Branded header with enhanced spacing */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-3 rounded-sm border border-border/40 bg-card/60 px-5 py-3 backdrop-blur-sm">
          <Sparkle className="size-7 text-brand" weight="fill" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">SocialBeam</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">AI-powered social media management</p>
      </div>

      <Card className="w-full rounded-sm border border-border/80 bg-card/80 shadow-[0_8px_32px_oklch(from_var(--foreground)_l_c_h_/_0.08),0_0_0_1px_oklch(from_var(--border)_l_c_h_/_0.5)] backdrop-blur-sm">
        <CardHeader className="pb-6 pt-8 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="mt-2 text-sm text-muted-foreground">Sign in to continue to your workspace</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium tracking-tight">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                className="rounded-sm border-border/60 bg-background/50 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 transition-all"
              />
              {emailError && (
                <p id="email-error" className="text-destructive text-xs" role="alert" aria-live="polite">
                  {emailError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium tracking-tight">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="rounded-sm border-border/60 bg-background/50 pr-10 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 transition-all"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="size-4" weight="bold" />
                  ) : (
                    <EyeIcon className="size-4" weight="bold" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-muted-foreground transition-colors hover:text-foreground underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
            {error && (
              <Alert variant="destructive" className="rounded-sm">
                <WarningCircle className="size-4" weight="bold" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full rounded-sm bg-brand text-white font-medium tracking-tight shadow-[0_2px_8px_oklch(from_var(--brand)_l_c_h_/_0.3)] transition-all hover:bg-brand/90 hover:shadow-[0_4px_12px_oklch(from_var(--brand)_l_c_h_/_0.4)] active:scale-[0.99]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator className="absolute inset-0 top-1/2" />
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 rounded-sm border-border/60 font-medium tracking-tight transition-all hover:bg-accent hover:border-border active:scale-[0.99]"
            disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              await signIn('google', { callbackUrl: '/' });
            }}
          >
            {googleLoading ? (
              <>
                <Spinner className="h-4 w-4 animate-spin" weight="bold" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-brand font-medium transition-colors hover:text-brand/80 underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
