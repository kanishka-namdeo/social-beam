'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Robot, User, PaperPlaneTilt, CheckCircle, Circle, Spinner,
  ShareNetwork, PencilSimple, Calendar, Bug, CaretDown, CaretRight,
  Warning, Coins, Sparkle, SignOut,
} from '@phosphor-icons/react';
import { renderOpenUIComponent, type OpenUICallbacks } from '@/lib/openui/library';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  completed?: boolean;
  uiComponent?: { type: string; props: Record<string, unknown> };
  uiComponents?: Array<{ type: string; props: Record<string, unknown> }>;
}

const ONBOARDING_STEPS = [
  { id: 'greeting', label: 'Welcome' },
  { id: 'collect_info', label: 'Your Info' },
  { id: 'connect_accounts', label: 'Connect' },
  { id: 'analyze_profile', label: 'Analyze' },
  { id: 'define_audience', label: 'Audience' },
  { id: 'train_brand_voice', label: 'Brand Voice' },
  { id: 'completion', label: 'Complete' },
];

type OnboardingPhase = 'goal-selection' | 'in-progress' | 'complete';

const ONBOARDING_COMPLETE_KEY = 'socialbeam-onboarding-complete';

function checkOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
}

function markOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

function relaunchTour(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}

export { relaunchTour };

function OpenUIRenderer({ component, callbacks }: { component: { type: string; props: Record<string, unknown> }; callbacks: OpenUICallbacks }) {
  return renderOpenUIComponent(component.type, component.props, callbacks);
}

function TikTokAuditBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <Warning className="size-5 text-warning mt-0.5 shrink-0" weight="fill" />
      <div>
        <p className="font-medium">Audit Pending — Posts Are Private</p>
        <p className="text-muted-foreground mt-1">
          TikTok posts will publish as visible only to you until our app audit is approved.
          This typically takes 3-7 business days and requires a published website with Privacy Policy + Terms of Service.
        </p>
      </div>
    </div>
  );
}

/** Process an SSE stream, returning accumulated assistant content and flags */
async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  assistantMessageId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setCurrentStep: React.Dispatch<React.SetStateAction<string>>,
  setCorrelationId: React.Dispatch<React.SetStateAction<string | null>>,
  setThreadId: React.Dispatch<React.SetStateAction<string | null>>,
  setPhase: React.Dispatch<React.SetStateAction<OnboardingPhase>>,
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<{ completed: boolean; interrupted: boolean; threadId: string | null }> {
  const decoder = new TextDecoder();
  let accumulatedContent = '';
  let isCompleted = false;
  let isInterrupted = false;
  let threadId: string | null = null;
  // Track processed content to prevent duplication from multiple stream events
  const processedContentChunks = new Set<string>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            // Deduplication: skip if we've already seen this exact content chunk
            if (processedContentChunks.has(data.content)) {
              continue;
            }
            processedContentChunks.add(data.content);
            accumulatedContent += data.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: accumulatedContent }
                  : m
              )
            );
          }
          if (data.step) {
            setCurrentStep(data.step);
          }
          if (data.completed === true) {
            isCompleted = true;
          }
          if (data.interrupted === true) {
            isInterrupted = true;
            threadId = data.threadId ?? threadId;
          }
          if (data.uiComponent) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, uiComponent: data.uiComponent }
                  : m
              )
            );
          }
          if (data.uiComponents && Array.isArray(data.uiComponents)) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, uiComponents: [...(m.uiComponents ?? []), ...data.uiComponents] }
                  : m
              )
            );
          }
          if (data.done) {
            setIsStreaming(false);
            if (data.correlationId) {
              setCorrelationId(data.correlationId as string);
            }
            if (data.threadId && !threadId) {
              threadId = data.threadId as string;
            }
          }
          if (data.threadId) {
            setThreadId(data.threadId as string);
            localStorage.setItem('onboarding_thread_id', data.threadId as string);
          }
          if (data.completed) {
            setPhase('complete');
            localStorage.removeItem('onboarding_thread_id');
          }
        } catch {
          // Ignore parse errors for non-JSON SSE data
        }
      }
    }

    if (isCompleted) break;
  }

  return { completed: isCompleted, interrupted: isInterrupted, threadId };
}

export default function OnboardingPage() {
  const { status, data: sessionData } = useSession();
  const userName = sessionData?.user?.name as string | undefined;
  const router = useRouter();
  const [phase, setPhase] = useState<OnboardingPhase>('goal-selection');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStep, setCurrentStep] = useState('greeting');
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [oauthStatus] = useState<{ success: boolean; platform: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oauthSuccess = params.get('oauth');
      if (oauthSuccess === 'success') {
        return { success: true, platform: params.get('platform') ?? 'unknown' };
      } else if (oauthSuccess === 'error') {
        return { success: false, platform: 'unknown' };
      }
    }
    return null;
  });
  const [showTikTokBanner] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oauthSuccess = params.get('oauth');
      const platform = params.get('platform') ?? '';
      return oauthSuccess === 'success' && platform.toLowerCase() === 'tiktok';
    }
    return false;
  });
  const [showDebugPanel] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('debug') === 'true';
    }
    return false;
  });
  const [debugExpanded, setDebugExpanded] = useState(true);
  const [creditBalance] = useState<number>(10);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const oauthChannelRef = useRef<BroadcastChannel | null>(null);
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (checkOnboardingComplete() && status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oauthSuccess = params.get('oauth');
      if (oauthSuccess === 'success' || oauthSuccess === 'error') {
        window.history.replaceState({}, '', '/onboarding');
      }
    }
  }, []);

  useEffect(() => {
    if (!oauthStatus || typeof window === 'undefined') return;
    const channel = new BroadcastChannel('oauth-callback');
    channel.postMessage({
      platform: oauthStatus.platform,
      success: oauthStatus.success,
    });
    channel.close();
  }, [oauthStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** Initial chat invoke (first message of a turn) */
  const sendToAgent = useCallback(async (userContent: string, prevMessages?: Message[]) => {
    const assistantMessageId = crypto.randomUUID();
    setIsStreaming(true);
    setIsInterrupted(false);

    // Safety timeout: re-enable input if stream never completes
    streamingTimeoutRef.current = setTimeout(() => {
      setIsStreaming(false);
    }, 30_000);

    const msgs = prevMessages ?? messages;

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userContent,
          messages: msgs.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream');
      }

      const { completed, interrupted, threadId: newThreadId } = await processStream(
        reader, assistantMessageId, setMessages, setCurrentStep, setCorrelationId, setThreadId, setPhase, setIsStreaming
      );

      if (completed) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, completed: true } : m
          )
        );
        markOnboardingComplete();
        setPhase('complete');
      } else if (interrupted) {
        setIsInterrupted(true);
        if (newThreadId) {
          setThreadId(newThreadId);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages]);

  /** Resume chat after an interrupt (subsequent messages) */
  const sendResume = useCallback(async (userContent: string) => {
    if (!threadId) return;

    const assistantMessageId = crypto.randomUUID();
    setIsStreaming(true);

    // Safety timeout: re-enable input if stream never completes
    streamingTimeoutRef.current = setTimeout(() => {
      setIsStreaming(false);
    }, 30_000);

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/onboarding/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userContent,
          threadId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to resume');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream');
      }

      const { completed, interrupted, threadId: newThreadId } = await processStream(
        reader, assistantMessageId, setMessages, setCurrentStep, setCorrelationId, setThreadId, setPhase, setIsStreaming
      );

      if (completed) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, completed: true } : m
          )
        );
        markOnboardingComplete();
        setPhase('complete');
        setIsInterrupted(false);
      } else if (interrupted) {
        setIsInterrupted(true);
        if (newThreadId) {
          setThreadId(newThreadId);
        }
      } else {
        setIsInterrupted(false);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [threadId]);

  // Check for stored threadId from a previous session and resume
  useEffect(() => {
    const storedThreadId = localStorage.getItem('onboarding_thread_id');
    if (storedThreadId && status === 'authenticated') {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setThreadId(storedThreadId);
        setPhase('in-progress');
        // Resume the session - this will trigger the backend to load existing data
        setTimeout(() => {
          sendResume('resume');
        }, 100);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    oauthChannelRef.current = new BroadcastChannel('oauth-callback');
    oauthChannelRef.current.onmessage = (event: MessageEvent) => {
      const { platform, success } = event.data as { platform: string; success: boolean };
      if (success) {
        const autoMsg = `I've connected my ${platform} account.`;
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: autoMsg,
          timestamp: new Date(),
        };
        setMessages((prev) => {
          const updated = [...prev, userMessage];
          if (threadId) {
            sendResume(autoMsg);
          } else {
            sendToAgent(autoMsg, updated);
          }
          return updated;
        });
      }
    };
    return () => {
      oauthChannelRef.current?.close();
    };
  }, [sendToAgent, sendResume, threadId]);

  const handleGoal = (goal: string) => {
    const goalMessages: Record<string, string> = {
      plan: "I'd like to plan a week of posts",
      write: "I want to write my next post",
      connect: "I want to connect my social media accounts",
    };
    const userMsg = goalMessages[goal] || goal;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMsg,
      timestamp: new Date(),
    };
    setPhase('in-progress');
    setMessages([userMessage]);
    sendToAgent(userMsg, [userMessage]);
  };

  const handleConnectPlatform = useCallback(async (platform: string) => {
    try {
      const response = await fetch('/api/onboarding/oauth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth');
      }

      const { authUrl } = (await response.json()) as { authUrl: string };
      if (!authUrl) return;

      const width = 600;
      const height = 700;
      const left = typeof window !== 'undefined' ? window.screen.width / 2 - width / 2 : 0;
      const top = typeof window !== 'undefined' ? window.screen.height / 2 - height / 2 : 0;
      const popup = window.open(
        authUrl,
        `oauth-${platform}`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
        }
      }, 500);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Failed to connect ${platform}. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userContent = input.trim();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };

    const prevMessages = [...messages, userMessage];
    setMessages(prevMessages);
    setInput('');

    if (isInterrupted && threadId) {
      await sendResume(userContent);
    } else {
      await sendToAgent(userContent, prevMessages);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const getStepIndex = () => {
    const idx = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);
    return idx >= 0 ? idx : 0;
  };

  const openUICallbacks: OpenUICallbacks = {
    onConnectPlatform: handleConnectPlatform,
    onGoToDashboard: () => router.push('/dashboard'),
    onFormSubmit: async (formName, data) => {
      const summary = Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      const userContent = `My info: ${summary}`;
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      };
      const prevMessages = [...messages, userMessage];
      setMessages(prevMessages);

      if (isInterrupted && threadId) {
        await sendResume(userContent);
      } else {
        await sendToAgent(userContent, prevMessages);
      }
    },
    onConfirm: () => {
      // User confirmed they want to continue with existing data
      // Always use sendResume when threadId exists since ResumeSummary only appears during resume scenarios
      if (threadId) {
        sendResume('continue');
      } else {
        sendToAgent('continue');
      }
    },
    onEdit: () => {
      // User wants to edit their existing info
      // Always use sendResume when threadId exists since ResumeSummary only appears during resume scenarios
      if (threadId) {
        sendResume("I'd like to edit my information");
      } else {
        sendToAgent("I'd like to edit my information");
      }
    },
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-12 w-96 rounded-lg" />
      </div>
    );
  }

  if (phase === 'goal-selection') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            What do you want to do first{userName ? `, ${userName}` : ''}?
          </h1>
          <p className="mt-2 text-muted-foreground">Pick a starting point — you can always come back</p>
        </div>

        <div className="mx-auto mt-8 grid w-full max-w-2xl gap-4 md:grid-cols-3">
          <Card
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => handleGoal('plan')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleGoal('plan')}
          >
            <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
              <Calendar className="size-8 text-primary" weight="duotone" />
              <div className="text-center">
                <h3 className="text-sm font-semibold">Plan a week of posts</h3>
                <p className="mt-1 text-xs text-muted-foreground">Generate a sample 5-day content plan</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => handleGoal('write')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleGoal('write')}
          >
            <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
              <PencilSimple className="size-8 text-primary" weight="duotone" />
              <div className="text-center">
                <h3 className="text-sm font-semibold">Write my next post</h3>
                <p className="mt-1 text-xs text-muted-foreground">Open AI compose with a topic prompt</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => handleGoal('connect')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleGoal('connect')}
          >
            <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
              <ShareNetwork className="size-8 text-primary" weight="duotone" />
              <div className="text-center">
                <h3 className="text-sm font-semibold">Connect accounts</h3>
                <p className="mt-1 text-xs text-muted-foreground">Link your social media profiles</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md border">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto size-12 text-green-600 dark:text-green-400" weight="duotone" />
            <CardTitle className="mt-3 text-xl">Setup complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">Your workspace is ready. Here&apos;s what&apos;s set up:</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600 dark:text-green-400" weight="fill" />
                <span>Workspace created</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600 dark:text-green-400" weight="fill" />
                <span>Goals configured</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkle className="size-4 text-purple-500" weight="fill" />
                <span>AI assistant ready</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <Coins className="size-4 text-primary" weight="duotone" />
              <span className="text-muted-foreground">You get <strong className="text-foreground">10 free credits</strong> to start using AI features</span>
            </div>
            <div className="space-y-2 pt-2">
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard/compose')} className="w-full">
                Start composing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: in-progress — progress tracker + chat
  const stepIndex = getStepIndex();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress tracker */}
      <div className="border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            {ONBOARDING_STEPS.map((step, idx) => {
              const isComplete = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              return (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        isComplete
                          ? 'border-green-600 bg-green-600 text-white dark:border-green-400 dark:bg-green-400'
                          : isCurrent
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="size-5" weight="fill" />
                      ) : isCurrent ? (
                        <Circle className="size-5 animate-pulse" weight="fill" />
                      ) : (
                        <Circle className="size-5" weight="light" />
                      )}
                    </div>
                    <span
                      className={`hidden text-xs font-medium md:block ${
                        isComplete
                          ? 'text-green-600 dark:text-green-400'
                          : isCurrent
                            ? 'text-primary'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < ONBOARDING_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        idx < stepIndex ? 'bg-green-600 dark:bg-green-400' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* OAuth status */}
          {oauthStatus && (
            <div className={`rounded-lg border p-3 text-sm ${
              oauthStatus.success
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
            }`}>
              {oauthStatus.success
                ? `Successfully connected ${oauthStatus.platform}!`
                : `Failed to connect ${oauthStatus.platform}. Please try again.`}
            </div>
          )}

          {/* TikTok audit banner */}
          {showTikTokBanner && <TikTokAuditBanner />}

          {/* Worked example for greeting step (no accounts) */}
          {currentStep === 'greeting' && messages.length <= 1 && (
            <div className="text-xs text-muted-foreground text-center italic">
              Demo: Sample posts shown below — these will be customized after you tell us about your business
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-ai-surface">
                  <Robot className={`size-5 ${isStreaming && !message.completed ? 'animate-pulse text-primary' : 'text-primary'}`} weight="duotone" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-ai-surface text-ai-surface-foreground'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {message.content || (
                    <span className="text-muted-foreground italic">Thinking...</span>
                  )}
                </div>

                {/* OpenUI component rendering — single or multi-component */}
                {message.uiComponent && (
                  <div className="mt-3">
                    <OpenUIRenderer component={message.uiComponent} callbacks={openUICallbacks} />
                  </div>
                )}
                {message.uiComponents && message.uiComponents.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {message.uiComponents.map((comp, i) => (
                      <OpenUIRenderer key={`${message.id}-ui-${i}`} component={comp} callbacks={openUICallbacks} />
                    ))}
                  </div>
                )}

                {message.completed && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" weight="fill" />
                    Complete
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-muted">
                  <User className="size-4 text-muted-foreground" weight="regular" />
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-4">
        <div className="mx-auto flex max-w-2xl gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 flex-1"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isInterrupted ? 'Reply to continue...' : 'Type your message...'}
              className="flex-1"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button type="button" variant="destructive" onClick={handleStop}>
                <Spinner className="mr-1 h-4 w-4 animate-spin" weight="bold" />
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <PaperPlaneTilt className="h-4 w-4" weight="bold" />
              </Button>
            )}
          </form>
          <Button variant="ghost" size="sm" onClick={async () => {
            try {
              await fetch('/api/onboarding/skip', { method: 'POST' });
              markOnboardingComplete();
              router.push('/dashboard');
            } catch {
              router.push('/dashboard');
            }
          }} className="text-muted-foreground">
            <SignOut className="mr-1 size-4" />
            Skip to Dashboard
          </Button>
        </div>
      </div>

      {/* Debug panel */}
      {showDebugPanel && (
        <div className="border-t bg-background px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => setDebugExpanded((p) => !p)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Bug className="size-4" weight="duotone" />
              <span>Debug Panel</span>
              {debugExpanded ? <CaretDown className="size-4" /> : <CaretRight className="size-4" />}
            </button>
            {debugExpanded && (
              <div className="mt-2 space-y-1 rounded-md border bg-muted/50 p-3 font-mono text-xs">
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Step:</span>
                  <span>{currentStep}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Correlation ID:</span>
                  <span className="break-all">{correlationId ?? 'pending'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Thread ID:</span>
                  <span className="break-all">{threadId ?? 'pending'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Interrupted:</span>
                  <span>{isInterrupted ? 'yes' : 'no'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Messages:</span>
                  <span>{messages.length}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Streaming:</span>
                  <span>{isStreaming ? 'yes' : 'no'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{messages.some((m) => m.completed) ? 'yes' : 'no'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Credits:</span>
                  <span>{creditBalance}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
