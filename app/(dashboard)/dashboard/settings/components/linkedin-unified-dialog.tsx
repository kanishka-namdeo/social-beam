'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkedinLogo, ArrowRight, CheckCircle, Warning, ArrowClockwise, X, LinkSimple } from '@phosphor-icons/react/ssr';
import { toast } from 'sonner';

interface LinkedInUnifiedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  /** If true, user already has OAuth connected, just needs session cookie */
  hasOAuthConnected?: boolean;
}

type Step = 'intro' | 'oauth' | 'oauth_complete' | 'session_intro' | 'session_connecting' | 'session_waiting' | 'success' | 'error';

export function LinkedInUnifiedDialog({ open, onOpenChange, onComplete, hasOAuthConnected = false }: LinkedInUnifiedDialogProps) {
  const [step, setStep] = useState<Step>(hasOAuthConnected ? 'session_intro' : 'intro');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [cookieExpiry, setCookieExpiry] = useState<Date | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [oauthWindow, setOauthWindow] = useState<Window | null>(null);

  const MAX_POLLS = 60; // 5 minutes at 5s intervals

  const resetState = useCallback(() => {
    setStep(hasOAuthConnected ? 'session_intro' : 'intro');
    setMessage('');
    setProgress(0);
    setCookieExpiry(null);
    setPollCount(0);
    if (oauthWindow) {
      oauthWindow.close();
      setOauthWindow(null);
    }
  }, [hasOAuthConnected, oauthWindow]);

  useEffect(() => {
    if (!open) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (oauthWindow) oauthWindow.close();
    };
  }, [oauthWindow]);

  // Handle OAuth popup closing
  useEffect(() => {
    if (step !== 'oauth') return;

    const checkPopup = setInterval(() => {
      if (oauthWindow?.closed) {
        clearInterval(checkPopup);
        // Check if OAuth completed by checking URL params
        setStep('oauth_complete');
      }
    }, 500);

    return () => clearInterval(checkPopup);
  }, [step, oauthWindow]);

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

  const pollForSessionCompletion = useCallback(async () => {
    setStep('session_waiting');
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

        checkCookieStatus().then((status) => {
          if (status?.cookieValid) {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setCookieExpiry(status.cookieExpiry ? new Date(status.cookieExpiry) : null);
            setStep('success');
            toast.success('LinkedIn session connected');
            onComplete?.();
          }
        });

        return newCount;
      });
    }, 5000);
  }, [checkCookieStatus, onComplete]);

  const startOAuthFlow = async () => {
    setStep('oauth');
    setMessage('Opening LinkedIn authorization...');

    try {
      const response = await fetch('/api/onboarding/oauth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'linkedin', redirectTo: 'settings' }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setStep('error');
        setMessage(data.error ?? 'Failed to start OAuth');
        toast.error('Failed to start LinkedIn connection');
        return;
      }

      const data = (await response.json()) as { authUrl?: string };
      if (!data.authUrl) {
        setStep('error');
        setMessage('No authorization URL returned');
        return;
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = typeof window !== 'undefined' ? window.screen.width / 2 - width / 2 : 0;
      const top = typeof window !== 'undefined' ? window.screen.height / 2 - height / 2 : 0;
      const popup = window.open(
        data.authUrl,
        'oauth-linkedin',
        `width=${width},height=${height},left=${left},top=${top}`,
      );
      setOauthWindow(popup);
    } catch (err) {
      setStep('error');
      setMessage('Failed to connect to server');
      toast.error('Connection failed');
    }
  };

  const startSessionConnection = async () => {
    setStep('session_connecting');
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

      setMessage('Please log in to LinkedIn in the browser window that just opened.');
      await pollForSessionCompletion();
    } catch (err) {
      setStep('error');
      setMessage('Failed to connect to server');
      toast.error('Connection failed');
    }
  };

  const handleRetrySession = async () => {
    setStep('session_intro');
  };

  const getStepDescription = () => {
    switch (step) {
      case 'intro':
        return 'Connect your LinkedIn account to enable posting, analytics, and inbox features.';
      case 'oauth':
        return 'Authorizing with LinkedIn...';
      case 'oauth_complete':
        return 'OAuth connected! Now let\'s set up your session for enhanced features.';
      case 'session_intro':
        return 'Now let\'s enable enhanced analytics and inbox features.';
      case 'session_connecting':
        return 'Setting up browser session...';
      case 'session_waiting':
        return 'Waiting for you to log in...';
      case 'success':
        return 'LinkedIn connected successfully.';
      case 'error':
        return 'Connection failed.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedinLogo className="size-6 text-[#0A66C2]" weight="fill" />
            Connect LinkedIn
          </DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Intro - show when no OAuth yet */}
          {step === 'intro' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What you get with LinkedIn connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-sm bg-muted/50">
                    <LinkSimple className="size-5 text-[#0A66C2] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Posting & Scheduling</p>
                      <p className="text-xs text-muted-foreground">Schedule posts directly via LinkedIn API</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-sm bg-muted/50">
                    <CheckCircle className="size-5 text-green-500 shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <p className="text-sm font-medium">Analytics</p>
                      <p className="text-xs text-muted-foreground">Track engagement, reach, and performance</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-sm bg-muted/50">
                    <Warning className="size-5 text-orange-500 shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <p className="text-sm font-medium">Inbox & Notifications</p>
                      <p className="text-xs text-muted-foreground">Monitor comments, messages, and activity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-sm bg-muted/50">
                    <ArrowRight className="size-5 text-brand shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Full Integration</p>
                      <p className="text-xs text-muted-foreground">Everything in one place</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Warning className="size-4" weight="fill" />
                  <AlertTitle className="text-xs">Two-step connection</AlertTitle>
                  <AlertDescription className="text-xs">
                    First, you'll authorize with LinkedIn. Then we'll open a browser for session capture (optional but recommended for full features).
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 pt-2">
                  <Button onClick={startOAuthFlow} className="flex-1">
                    <ArrowRight className="mr-2 size-4" />
                    Connect with LinkedIn
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* OAuth in progress */}
          {(step === 'oauth' || step === 'oauth_complete') && (
            <div className="flex flex-col items-center gap-4 py-8">
              {step === 'oauth' ? (
                <>
                  <LinkedinLogo className="size-12 text-[#0A66C2] animate-pulse" weight="fill" />
                  <p className="text-sm text-muted-foreground">{message}</p>
                  <Progress value={30} className="w-full max-w-md" />
                  <p className="text-xs text-muted-foreground">Waiting for authorization...</p>
                </>
              ) : (
                <>
                  <CheckCircle className="size-12 text-green-500" weight="fill" />
                  <p className="text-lg font-semibold">OAuth Connected!</p>
                  <p className="text-sm text-muted-foreground">Now let's set up enhanced features...</p>
                </>
              )}
            </div>
          )}

          {/* Step 2: Session intro - show when OAuth already done or after OAuth complete */}
          {step === 'session_intro' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enable Enhanced Features</CardTitle>
                <CardDescription>
                  We need your LinkedIn session cookie to access analytics and inbox features that aren't available via the standard API.
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
                    Your cookie is encrypted before storage. Sessions last approximately 1 year. You can disconnect at any time.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 pt-2">
                  <Button onClick={startSessionConnection} className="flex-1">
                    <ArrowRight className="mr-2 size-4" />
                    Start Session Connection
                  </Button>
                  <Button variant="outline" onClick={() => {
                    onComplete?.();
                    onOpenChange(false);
                  }}>
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session connecting */}
          {step === 'session_connecting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <LinkedinLogo className="size-12 text-[#0A66C2] animate-pulse" weight="fill" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <Progress value={10} className="w-full max-w-md" />
            </div>
          )}

          {/* Session waiting for login */}
          {step === 'session_waiting' && (
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
                <AlertTitle>Don't close the browser window</AlertTitle>
                <AlertDescription>
                  Please complete the login in the browser window that opened.
                  We'll automatically detect when you're logged in.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="size-16 text-green-500" weight="fill" />
              <div className="text-center">
                <p className="text-lg font-semibold">Connected Successfully</p>
                <p className="text-sm text-muted-foreground">
                  Your LinkedIn account is now fully connected with posting, analytics, and inbox access.
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

          {/* Error */}
          {step === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <X className="size-4" weight="fill" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                {hasOAuthConnected ? (
                  <Button onClick={handleRetrySession} variant="outline" className="flex-1">
                    <ArrowClockwise className="mr-2 size-4" />
                    Try Session Again
                  </Button>
                ) : (
                  <Button onClick={startOAuthFlow} variant="outline" className="flex-1">
                    <ArrowClockwise className="mr-2 size-4" />
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
