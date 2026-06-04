'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkedinLogo, ArrowRight, CheckCircle, Warning, ArrowClockwise, X } from '@phosphor-icons/react/ssr';
import { toast } from 'sonner';

interface LinkedInSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionComplete?: () => void;
}

export function LinkedInSessionDialog({ open, onOpenChange, onSessionComplete }: LinkedInSessionDialogProps) {
  const [step, setStep] = useState<'intro' | 'connecting' | 'waiting' | 'success' | 'error' | 'expired'>('intro');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [cookieExpiry, setCookieExpiry] = useState<Date | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_POLLS = 60; // 5 minutes at 5s intervals

  const resetState = useCallback(() => {
    setStep('intro');
    setMessage('');
    setProgress(0);
    setSessionId(null);
    setPollCount(0);
    setCookieExpiry(null);
  }, []);

  useEffect(() => {
    if (!open) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      resetState();
    }
  }, [open, resetState]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const checkCookieStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox/status?platform=linkedin');
      const data = await res.json();
      if (data.cookieValid) {
        return data;
      }
    } catch {
      // Ignore
    }
    return null;
  }, []);

  const pollForCompletion = useCallback(async (sid: string) => {
    setStep('waiting');
    setPollCount(0);

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      setPollCount((prev) => {
        const newCount = prev + 1;
        setProgress(Math.min((newCount / MAX_POLLS) * 100, 100));

        if (newCount >= MAX_POLLS) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setStep('error');
          setMessage('Login timed out. Please try again.');
          toast.error('LinkedIn connection timed out');
          return newCount;
        }

        // Check if cookie was saved
        checkCookieStatus().then((status) => {
          if (status?.cookieValid) {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setCookieExpiry(status.cookieExpiry ? new Date(status.cookieExpiry) : null);
            setStep('success');
            toast.success('LinkedIn session connected');
            onSessionComplete?.();
          }
        });

        return newCount;
      });
    }, 5000);
  }, [checkCookieStatus, onSessionComplete]);

  const handleStartConnection = async () => {
    setStep('connecting');
    setMessage('Opening browser...');

    try {
      const res = await fetch('/api/session/linkedin-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'linkedin',
          action: 'start',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStep('error');
        setMessage(data.error || 'Failed to start browser session');
        toast.error('Failed to start LinkedIn connection');
        return;
      }

      setSessionId(data.sessionId);
      setMessage('Please log in to LinkedIn in the browser window that just opened.');
      setStep('waiting');

      // Start polling for completion
      await pollForCompletion(data.sessionId);
    } catch (err) {
      setStep('error');
      setMessage('Failed to connect to server');
      toast.error('Connection failed');
    }
  };

  const handleExtractCookie = async () => {
    setStep('connecting');
    setMessage('Checking LinkedIn session...');

    try {
      const res = await fetch('/api/session/linkedin-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'linkedin',
          action: 'extract',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStep('error');
        setMessage(data.message || 'Failed to extract cookie');
        toast.error('Cookie extraction failed');
        return;
      }

      setStep('success');
      setMessage(data.message);
      toast.success('LinkedIn session cookie saved');
      onSessionComplete?.();
    } catch (err) {
      setStep('error');
      setMessage('Failed to connect to server');
      toast.error('Connection failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedinLogo className="size-6 text-[#0A66C2]" weight="fill" />
            LinkedIn Session Connection
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && 'Connect your LinkedIn session to enable enhanced analytics and inbox features.'}
            {step === 'connecting' && 'Setting up browser session...'}
            {step === 'waiting' && 'Waiting for you to log in...'}
            {step === 'success' && 'LinkedIn session connected successfully.'}
            {step === 'error' && 'Connection failed.'}
            {step === 'expired' && 'LinkedIn session expired.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'intro' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How it works</CardTitle>
                <CardDescription>
                  We need your LinkedIn session cookie to access analytics and inbox features that aren&apos;t available via the standard API.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">We open a browser window</p>
                    <p className="text-xs text-muted-foreground">A new browser window opens with LinkedIn login page</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium">You log in to LinkedIn</p>
                    <p className="text-xs text-muted-foreground">Log in normally in the browser window</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium">We extract the session cookie</p>
                    <p className="text-xs text-muted-foreground">Your session is securely encrypted and stored</p>
                  </div>
                </div>

                <Alert>
                  <Warning className="size-4" weight="fill" />
                  <AlertTitle className="text-xs">Privacy & Security</AlertTitle>
                  <AlertDescription className="text-xs">
                    • Your cookie is encrypted before storage<br />
                    • Sessions last approximately 1 year<br />
                    • We only access public profile and post data<br />
                    • You can disconnect at any time
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleStartConnection} className="flex-1">
                    <ArrowRight className="mr-2 size-4" />
                    Start Connection
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'connecting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <LinkedinLogo className="size-12 text-[#0A66C2] animate-pulse" weight="fill" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <Progress value={10} className="w-full max-w-md" />
            </div>
          )}

          {step === 'waiting' && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <LinkedinLogo className="size-12 text-[#0A66C2] animate-bounce" weight="fill" />
                <p className="text-sm font-medium text-center">{message}</p>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                Polling... {pollCount}/{MAX_POLLS} attempts
              </p>
              <Alert>
                <Warning className="size-4" />
                <AlertTitle>Don&apos;t close the browser window</AlertTitle>
                <AlertDescription>
                  Please complete the login in the browser window that opened.
                  We&apos;ll automatically detect when you&apos;re logged in.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="size-16 text-green-500" weight="fill" />
              <div className="text-center">
                <p className="text-lg font-semibold">Connected Successfully</p>
                <p className="text-sm text-muted-foreground">
                  Your LinkedIn session is now active.
                </p>
                {cookieExpiry && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Session expires: {cookieExpiry.toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <X className="size-4" weight="fill" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={handleStartConnection} variant="outline" className="flex-1">
                  <ArrowClockwise className="mr-2 size-4" />
                  Try Again
                </Button>
                <Button onClick={handleExtractCookie} className="flex-1">
                  <LinkedinLogo className="mr-2 size-4" weight="fill" />
                  Extract Cookie
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Or run <code className="bg-muted px-1 py-0.5 rounded">npx tsx scripts/extract-linkedin-cookie.mjs</code> manually
              </p>
            </div>
          )}

          {step === 'expired' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <Warning className="size-4" weight="fill" />
                <AlertTitle>Session Expired</AlertTitle>
                <AlertDescription>
                  Your LinkedIn session has expired. Please reconnect to continue using enhanced features.
                </AlertDescription>
              </Alert>
              <Button onClick={handleStartConnection} className="w-full">
                <ArrowClockwise className="mr-2 size-4" />
                Reconnect LinkedIn
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
