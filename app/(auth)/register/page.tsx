'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon, Spinner, Sparkle, WarningCircle } from '@phosphor-icons/react/ssr';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(password: string): { score: number; feedback: string[] } {
  const checks = [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), label: 'Contains uppercase letter' },
    { met: /[0-9]/.test(password), label: 'Contains number' },
    { met: /[^A-Za-z0-9]/.test(password), label: 'Contains special character' },
  ];
  return {
    score: checks.filter((c) => c.met).length,
    feedback: checks.map((c) => c.label),
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !EMAIL_REGEX.test(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (value && value !== password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating your account...');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        toast.dismiss(loadingToast);
        const data = await res.json();
        setError(data.error ?? 'Registration failed');
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.dismiss(loadingToast);
        setError('Account created but sign in failed. Please log in manually.');
      } else {
        toast.dismiss(loadingToast);
        toast.success('Account created!', { description: 'Welcome to SocialBeam' });
        router.push('/onboarding');
        router.refresh();
      }
    } catch {
      toast.dismiss(loadingToast);
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
          <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Create an account</CardTitle>
          <CardDescription className="mt-2 text-sm text-muted-foreground">Start managing your social media with AI</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-8 pb-8 pt-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium tracking-tight">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                autoComplete="name"
                className="rounded-sm border-border/60 bg-background/50 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 transition-all"
              />
            </div>
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (confirmPassword && e.target.value !== confirmPassword) {
                      setConfirmPasswordError('Passwords do not match');
                    } else if (confirmPassword && e.target.value === confirmPassword) {
                      setConfirmPasswordError(null);
                    }
                  }}
                  placeholder="Create a strong password"
                  required
                  className="rounded-sm border-border/60 bg-background/50 pr-10 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 transition-all"
                  autoComplete="new-password"
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
              {password && (
                <div className="space-y-2">
                  <Progress
                    value={(passwordStrength.score / 4) * 100}
                    className={cn(
                      'h-1 rounded-sm',
                      passwordStrength.score <= 1 && '[&>[data-slot=progress-indicator]]:bg-destructive',
                      passwordStrength.score === 2 && '[&>[data-slot=progress-indicator]]:bg-warning',
                      passwordStrength.score >= 3 && '[&>[data-slot=progress-indicator]]:bg-success',
                    )}
                  />
                  <ul className="space-y-1">
                    {passwordStrength.feedback.map((item, i) => {
                      const met = (
                        (i === 0 && password.length >= 8) ||
                        (i === 1 && /[A-Z]/.test(password)) ||
                        (i === 2 && /[0-9]/.test(password)) ||
                        (i === 3 && /[^A-Za-z0-9]/.test(password))
                      );
                      return (
                        <li key={i} className="flex items-center gap-1.5 text-xs">
                          {met ? (
                            <CheckCircleIcon className="size-3.5 text-success" weight="bold" />
                          ) : (
                            <XCircleIcon className="size-3.5 text-muted-foreground" weight="bold" />
                          )}
                          <span className={met ? 'text-success' : 'text-muted-foreground'}>
                            {item}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium tracking-tight">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="rounded-sm border-border/60 bg-background/50 pr-10 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 transition-all"
                  autoComplete="new-password"
                  aria-invalid={!!confirmPasswordError}
                  aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="size-4" weight="bold" />
                  ) : (
                    <EyeIcon className="size-4" weight="bold" />
                  )}
                </Button>
              </div>
              {confirmPasswordError && (
                <p id="confirm-password-error" className="text-destructive text-xs" role="alert" aria-live="polite">
                  {confirmPasswordError}
                </p>
              )}
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
                  Creating account...
                </>
              ) : (
                'Create Account'
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
            onClick={() => signIn('google', { callbackUrl: '/onboarding' })}
          >
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
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-brand font-medium transition-colors hover:text-brand/80 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
