'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, WarningCircle, Spinner } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkle } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      setStatus('success');
      return;
    }

    if (error) {
      setStatus('error');
      return;
    }

    if (!token) {
      setStatus('error');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        setStatus('error');
      });
  }, [searchParams]);

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
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {status === 'loading' && 'Verifying your email'}
            {status === 'success' && 'Email verified!'}
            {status === 'error' && 'Verification failed'}
          </CardTitle>
          <CardDescription className="mt-2 text-sm text-muted-foreground">
            {status === 'loading' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email has been verified. You can now sign in.'}
            {status === 'error' && 'This verification link is invalid or has expired.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-6 space-y-6">
          <div className="flex justify-center">
            {status === 'loading' && (
              <Spinner className="size-12 animate-spin text-brand" weight="bold" />
            )}
            {status === 'success' && (
              <CheckCircle className="size-12 text-emerald-500" weight="fill" />
            )}
            {status === 'error' && (
              <WarningCircle className="size-12 text-destructive" weight="fill" />
            )}
          </div>

          {status === 'success' && (
            <Button asChild className="w-full rounded-sm bg-brand text-white font-medium tracking-tight shadow-[0_2px_8px_oklch(from_var(--brand)_l_c_h_/_0.3)] transition-all hover:bg-brand/90 hover:shadow-[0_4px_12px_oklch(from_var(--brand)_l_c_h_/_0.4)] active:scale-[0.99]">
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          {status === 'error' && (
            <Button asChild variant="outline" className="w-full rounded-sm border-border/60 font-medium tracking-tight transition-all hover:bg-accent hover:border-border active:scale-[0.99]">
              <Link href="/login">Back to Sign In</Link>
            </Button>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-brand font-medium transition-colors hover:text-brand/80 underline-offset-4 hover:underline">
              Return to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
