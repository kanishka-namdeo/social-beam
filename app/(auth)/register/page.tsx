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
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon, Spinner, Sparkle } from '@phosphor-icons/react';
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-brand/5 via-muted/10 to-background p-4">
      {/* Branded header */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
        <div className="flex items-center gap-2">
          <Sparkle className="size-8 text-brand" weight="fill" />
          <h1 className="text-2xl font-semibold text-brand">SocialBeam</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">AI-powered social media management</p>
      </div>

      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Start managing your social media with AI</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              {emailError && (
                <p className="text-destructive text-xs" role="alert" aria-live="polite">
                  {emailError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
                  placeholder="••••••••"
                  required
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="size-4" weight="bold" />
                  ) : (
                    <EyeIcon className="size-4" weight="bold" />
                  )}
                </button>
              </div>
              {password && (
                <div className="space-y-2">
                  <Progress
                    value={(passwordStrength.score / 4) * 100}
                    className={cn(
                      'h-1',
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
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="size-4" weight="bold" />
                  ) : (
                    <EyeIcon className="size-4" weight="bold" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-destructive text-xs" role="alert" aria-live="polite">
                  {confirmPasswordError}
                </p>
              )}
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert" aria-live="polite">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: '/onboarding' })}
            >
              Continue with Google
            </Button>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
