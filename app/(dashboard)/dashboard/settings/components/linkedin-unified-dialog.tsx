'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkedinLogo, ArrowRight, CheckCircle, Warning, ArrowClockwise, X } from '@phosphor-icons/react/ssr';
import { toast } from 'sonner';
import { notifySuccessWithCategory, notifyErrorWithCategory } from '@/lib/notifications';

interface LinkedInUnifiedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  /** @deprecated No longer used — kept for API compatibility */
  hasOAuthConnected?: boolean;
}

type Step = 'intro' | 'connecting' | 'waiting' | 'success' | 'error';

export function LinkedInUnifiedDialog({ open, onOpenChange, onComplete }: LinkedInUnifiedDialogProps) {
  const [step, setStep] = useState<Step>('intro');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [cookieExpiry, setCookieExpiry] = useState<Date | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [flowId, setFlowId] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_POLLS = 120; // 10 minutes at 5s intervals

  const resetState = useCallback(() => {
    setStep('intro');
    setMessage('');
    setProgress(0);
    setCookieExpiry(null);
    setPollCount(0);
    setFlowId(null);
  }, []);

  useEffect(() => {
    if (!open) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const checkFlowStatus = useCallback(async (currentFlowId: string) => {
    try {
      const res = await fetch(`/api/session/linkedin-flow-status?flowId=${currentFlowId}`);
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }, []);

  const pollForCompletion = useCallback(async (currentFlowId: string) => {
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
          setMessage('Connection timed out. Please try again.');
          notifyErrorWithCategory('LinkedIn connection timed out', { category: 'connection' });
          return newCount;
        }

        checkFlowStatus(currentFlowId).then((status) => {
          if (status?.status === 'complete') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setCookieExpiry(status.cookieExpiry ? new Date(status.cookieExpiry) : null);
            setStep('success');
            notifySuccessWithCategory('LinkedIn connected successfully', { category: 'connection' });
            onComplete?.();
          } else if (status?.status === 'error') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setStep('error');
            setMessage(status.error || 'Connection failed');
            notifyErrorWithCategory('LinkedIn connection failed', { category: 'connection' });
          }
        });

        return newCount;
      });
    }, 5000);
  }, [checkFlowStatus, onComplete]);

  const startConnection = async () => {
    setStep('connecting');
    setMessage('Opening browser...');

    try {
      const res = await fetch('/api/session/linkedin-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'linkedin',
          action: 'start',
          startOAuthAfterLogin: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStep('error');
        setMessage(data.error || 'Failed to start browser session');
        notifyErrorWithCategory('Failed to start LinkedIn connection', { category: 'connection' });
        return;
      }

      const newFlowId = data.flowId || data.sessionId;
      if (!newFlowId) {
        setStep('error');
        setMessage('No flow ID returned from server');
        notifyErrorWithCategory('Connection failed', { category: 'connection' });
        return;
      }

      setFlowId(newFlowId);
      setMessage('Please log in to LinkedIn in the browser window that just opened.');
      await pollForCompletion(newFlowId);
    } catch (err) {
      setStep('error');
      setMessage('Failed to connect to server');
      notifyErrorWithCategory('Connection failed', { category: 'connection' });
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'intro':
        return 'Connect your LinkedIn account to enable posting, analytics, and inbox features.';
      case 'connecting':
        return 'Opening browser window...';
      case 'waiting':
        return 'Complete the login in the browser window. We\'ll handle the rest automatically.';
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedinLogo className="size-6 text-[#0A66C2]" weight="fill" />
            Connect LinkedIn
          </DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Intro */}
          {step === 'intro' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What you get</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 p-2.5 rounded-sm bg-muted/50">
                    <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <p className="text-sm font-medium">Posting & Scheduling</p>
                      <p className="text-xs text-muted-foreground">Schedule posts via LinkedIn API</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-sm bg-muted/50">
                    <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <p className="text-sm font-medium">Analytics</p>
                      <p className="text-xs text-muted-foreground">Track engagement and reach</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-sm bg-muted/50">
                    <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <p className="text-sm font-medium">Inbox</p>
                      <p className="text-xs text-muted-foreground">Monitor comments and messages</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-sm bg-muted/50">
                    <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <p className="text-sm font-medium">Full Integration</p>
                      <p className="text-xs text-muted-foreground">Everything in one place</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Warning className="size-4" weight="fill" />
                  <AlertTitle className="text-xs">One-step connection</AlertTitle>
                  <AlertDescription className="text-xs">
                    We'll open a browser window. Log in to LinkedIn — everything else happens automatically.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 pt-2">
                  <Button onClick={startConnection} className="flex-1">
                    <ArrowRight className="mr-2 size-4" />
                    Connect LinkedIn
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connecting / launching browser */}
          {step === 'connecting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <LinkedinLogo className="size-12 text-[#0A66C2] animate-pulse" weight="fill" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <Progress value={10} className="w-full max-w-md" />
            </div>
          )}

          {/* Waiting for user to log in and approve */}
          {step === 'waiting' && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <LinkedinLogo className="size-12 text-[#0A66C2] animate-bounce" weight="fill" />
                <p className="text-sm font-medium text-center">{message}</p>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                {pollCount}/{MAX_POLLS} checks
              </p>
              <Alert>
                <Warning className="size-4" />
                <AlertTitle>Don't close the browser window</AlertTitle>
                <AlertDescription>
                  Log in to LinkedIn in the browser. We'll detect your login and complete the connection automatically.
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
                <Button onClick={startConnection} variant="outline" className="flex-1">
                  <ArrowClockwise className="mr-2 size-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
