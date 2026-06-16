'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner, Sparkle, WarningCircle, CheckCircle } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE = 'If an account with that email exists, we sent a password reset link.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? 'Something went wrong.');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle className="text-2xl font-semibold tracking-tight">Reset your password</CardTitle>
          <CardDescription className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-6 space-y-6">
          {submitted ? (
            <div className="space-y-4">
              <Alert className="rounded-sm border-primary/20 bg-primary/5">
                <CheckCircle className="size-4 text-primary" weight="bold" />
                <AlertDescription className="text-sm">{SUCCESS_MESSAGE}</AlertDescription>
              </Alert>
              <p className="text-center text-sm text-muted-foreground">
                Check your inbox for a reset link. The link expires in 1 hour.
              </p>
              <div className="text-center">
                <Link href="/login" className="text-sm text-brand font-medium transition-colors hover:text-brand/80 underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/login" className="text-brand font-medium transition-colors hover:text-brand/80 underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
