'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner, EyeIcon, EyeSlashIcon, Sparkle, WarningCircle, CheckCircle } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Something went wrong.');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive" className="rounded-sm">
          <WarningCircle className="size-4" weight="bold" />
          <AlertDescription>Invalid reset link. Please request a new one.</AlertDescription>
        </Alert>
        <div className="text-center">
          <Link href="/forgot-password" className="text-sm text-brand font-medium transition-colors hover:text-brand/80 underline-offset-4 hover:underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert className="rounded-sm border-primary/20 bg-primary/5">
          <CheckCircle className="size-4 text-primary" weight="bold" />
          <AlertDescription className="text-sm">Your password has been reset successfully.</AlertDescription>
        </Alert>
        <p className="text-center text-sm text-muted-foreground">
          Redirecting you to sign in...
        </p>
        <div className="text-center">
          <Link href="/login" className="text-sm text-brand font-medium transition-colors hover:text-brand/80 underline-offset-4 hover:underline">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium tracking-tight">New password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium tracking-tight">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            className="rounded-sm border-border/60 bg-background/50 pr-10 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 transition-all"
            autoComplete="new-password"
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
            Resetting...
          </>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex w-full max-w-md flex-col">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-3 rounded-sm border border-border/40 bg-card/60 px-5 py-3 backdrop-blur-sm">
          <Sparkle className="size-7 text-brand" weight="fill" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">SocialBeam</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">AI-powered social media management</p>
      </div>

      <Card className="w-full rounded-sm border border-border/80 bg-card/80 shadow-[0_8px_32px_oklch(from_var(--foreground)_l_c_h_/_0.08),0_0_0_1px_oklch(from_var(--border)_l_c_h_/_0.5)] backdrop-blur-sm">
        <CardHeader className="pb-6 pt-8 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Set new password</CardTitle>
          <CardDescription className="mt-2 text-sm text-muted-foreground">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-6 space-y-6">
          <Suspense fallback={
            <div className="flex justify-center py-4">
              <Spinner className="size-5 animate-spin text-muted-foreground" weight="bold" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-brand font-medium transition-colors hover:text-brand/80 underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
