'use client';

import { createLibrary, defineComponent } from '@openuidev/react-lang';
import type { Library, ComponentRenderProps } from '@openuidev/react-lang';
import { z } from 'zod/v4';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Sparkle, ArrowRight, CheckCircle, ArrowClockwise } from '@phosphor-icons/react/ssr';

// ---------------------------------------------------------------------------
// Callback registry type — page supplies these at runtime
// ---------------------------------------------------------------------------

export interface OpenUICallbacks {
  onConnectPlatform?: (platform: string) => void;
  onFormSubmit?: (formName: string, data: Record<string, string>) => void;
  onBrandVoiceRegenerate?: () => void;
  onBrandVoiceAccept?: () => void;
  onGoToDashboard?: () => void;
  onConfirm?: () => void;
  onEdit?: () => void;
}

// ---------------------------------------------------------------------------
// Component schemas
// ---------------------------------------------------------------------------

export const OnboardingFormSchema = z.object({
  title: z.string().describe('Form title'),
  fields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'email', 'textarea', 'select']),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
  })),
  formName: z.string().optional().describe('Identifier for form submission callback'),
});

export const AccountConnectionCardSchema = z.object({
  platform: z.string().describe('Platform name'),
  status: z.enum(['disconnected', 'connecting', 'connected', 'error']),
});

export const ProfileSummaryCardSchema = z.object({
  tone: z.string().describe('Detected brand tone'),
  postTypes: z.record(z.string(), z.number()).describe('Distribution of post types'),
  imageAnalysis: z.object({
    categories: z.array(z.string()),
    imageFrequency: z.number(),
  }).describe('Analysis of image content'),
  audienceInsights: z.array(z.string()).describe('Key audience insights'),
});

export const StepIndicatorSchema = z.object({
  currentStep: z.number().describe('Current step number'),
  totalSteps: z.number().describe('Total number of steps'),
  stepLabels: z.array(z.string()).describe('Labels for each step'),
});

export const BrandVoicePreviewSchema = z.object({
  samplePosts: z.array(z.object({
    platform: z.string(),
    content: z.string(),
  })).describe('Sample posts generated with the brand voice'),
  voiceDescription: z.string().optional().describe('Summary of the detected brand voice'),
});

export const CompletionCelebrationSchema = z.object({
  accomplishments: z.array(z.string()).describe('List of completed onboarding items'),
});

export const AudienceSummarySchema = z.object({
  demographics: z.string().optional().describe('Audience demographics summary'),
  interests: z.array(z.string()).optional().describe('Audience interest topics'),
  painPoints: z.array(z.string()).optional().describe('Audience pain points'),
});

export const ResumeSummarySchema = z.object({
  title: z.string().describe('Title for the summary card'),
  message: z.string().describe('Personalized welcome message'),
  collectedData: z.object({
    name: z.string().optional().describe('User name'),
    businessType: z.string().optional().describe('Business type'),
    industry: z.string().optional().describe('Industry/niche'),
    audience: z.string().optional().describe('Target audience description'),
    goals: z.string().optional().describe('Social media goals'),
    connectedAccounts: z.array(z.string()).optional().describe('List of connected platforms'),
    hasBrandVoice: z.boolean().optional().describe('Whether brand voice is set up'),
  }).describe('Summary of collected data'),
  nextStep: z.string().describe('The next step the user will proceed to'),
});

// ---------------------------------------------------------------------------
// Component renderers
// ---------------------------------------------------------------------------

export function AccountConnectionCardComponent(props: z.infer<typeof AccountConnectionCardSchema> & { onConnect?: () => void }): ReactNode {
  const statusColors: Record<string, string> = {
    disconnected: 'text-muted-foreground',
    connecting: 'text-warning',
    connected: 'text-success',
    error: 'text-destructive',
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <span className="font-medium capitalize">{props.platform}</span>
        <span className={`ml-2 text-xs ${statusColors[props.status] ?? ''}`}>{props.status}</span>
      </div>
      {props.status === 'disconnected' && props.onConnect && (
        <Button size="sm" onClick={props.onConnect}>
          Connect
        </Button>
      )}
      {props.status === 'connected' && (
        <CheckCircle className="size-5 text-success" weight="fill" />
      )}
    </div>
  );
}

export function ProfileSummaryCardComponent(props: z.infer<typeof ProfileSummaryCardSchema>): ReactNode {
  const totalPosts = Object.values(props.postTypes).reduce((sum, n) => sum + n, 0);

  return (
    <div className="rounded-lg border p-4 bg-card space-y-3">
      <h3 className="text-lg font-semibold">Brand Profile</h3>
      <p className="text-sm"><strong>Tone:</strong> {props.tone}</p>

      {totalPosts > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Content Mix</p>
          <div className="space-y-1">
            {Object.entries(props.postTypes).map(([type, count]) => {
              const pct = totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0;
              return (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span className="w-16 capitalize text-muted-foreground">{type}</span>
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {props.imageAnalysis.categories.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Image Categories</p>
          <div className="flex flex-wrap gap-1">
            {props.imageAnalysis.categories.map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
            ))}
          </div>
        </div>
      )}

      {props.audienceInsights.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Key Insights</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {props.audienceInsights.map((insight, i) => <li key={i}>{insight}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function StepIndicatorComponent(props: z.infer<typeof StepIndicatorSchema>): ReactNode {
  return (
    <div className="flex gap-1">
      {Array.from({ length: props.totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${i < props.currentStep ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

export function OnboardingFormComponent(props: z.infer<typeof OnboardingFormSchema> & { onSubmit?: (data: Record<string, string>) => void }): ReactNode {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    props.onSubmit?.(values);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-4 bg-card space-y-3">
      <h3 className="text-lg font-semibold">{props.title}</h3>
      <Separator />
      {props.fields.map((field) => (
        <div key={field.name} className="space-y-1">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={field.placeholder}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => handleChange(field.name, e.target.value)}
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          )}
        </div>
      ))}
      <Button type="submit" className="w-full">Submit</Button>
    </form>
  );
}

export function BrandVoicePreviewComponent(props: z.infer<typeof BrandVoicePreviewSchema> & { onRegenerate?: () => void; onAccept?: () => void }): ReactNode {
  return (
    <div className="rounded-lg border p-4 bg-card space-y-3">
      <div className="flex items-center gap-2">
        <Sparkle className="size-5 text-primary" weight="fill" />
        <h3 className="text-lg font-semibold">Brand Voice Preview</h3>
      </div>
      {props.voiceDescription && (
        <p className="text-sm text-muted-foreground">{props.voiceDescription}</p>
      )}
      <Separator />
      <div className="space-y-3">
        {props.samplePosts.map((post, i) => (
          <div key={i} className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">{post.platform}</Badge>
            </div>
            <p className="text-sm">{post.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {props.onRegenerate && (
          <Button variant="outline" size="sm" onClick={props.onRegenerate}>
            <ArrowClockwise className="mr-1 size-4" /> Regenerate
          </Button>
        )}
        {props.onAccept && (
          <Button size="sm" onClick={props.onAccept}>
            <CheckCircle className="mr-1 size-4" weight="fill" /> Accept Voice
          </Button>
        )}
      </div>
    </div>
  );
}

export function CompletionCelebrationComponent(props: z.infer<typeof CompletionCelebrationSchema> & { onGoToDashboard?: () => void }): ReactNode {
  return (
    <div className="rounded-lg border p-4 bg-card space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="size-6 text-success" weight="fill" />
        <h3 className="text-lg font-semibold">Setup Complete!</h3>
      </div>
      <div className="space-y-2">
        {props.accomplishments.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <CheckCircle className="size-4 text-success" weight="fill" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      {props.onGoToDashboard && (
        <Button onClick={props.onGoToDashboard} className="w-full">
          Go to Dashboard <ArrowRight className="ml-1 size-4" />
        </Button>
      )}
    </div>
  );
}

export function AudienceSummaryComponent(props: z.infer<typeof AudienceSummarySchema>): ReactNode {
  return (
    <div className="rounded-lg border p-4 bg-card space-y-3">
      <h3 className="text-lg font-semibold">Target Audience</h3>
      {props.demographics && (
        <p className="text-sm"><strong>Demographics:</strong> {props.demographics}</p>
      )}
      {props.interests && props.interests.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Interests</p>
          <div className="flex flex-wrap gap-1">
            {props.interests.map((interest, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{interest}</Badge>
            ))}
          </div>
        </div>
      )}
      {props.painPoints && props.painPoints.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Pain Points</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {props.painPoints.map((point, i) => <li key={i}>{point}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ResumeSummaryComponent(props: z.infer<typeof ResumeSummarySchema> & { onConfirm?: () => void; onEdit?: () => void }): ReactNode {
  // Format the next step name for display (e.g., 'define_audience' -> 'Define Audience')
  const formatStepName = (step: string) => {
    return step
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Build list of collected items
  const collectedItems = [
    props.collectedData.name && `Name: ${props.collectedData.name}`,
    props.collectedData.businessType && `Business: ${props.collectedData.businessType}`,
    props.collectedData.industry && `Industry: ${props.collectedData.industry}`,
    props.collectedData.audience && 'Audience defined',
    props.collectedData.goals && 'Goals set',
    props.collectedData.connectedAccounts && props.collectedData.connectedAccounts.length > 0 &&
      `Accounts: ${props.collectedData.connectedAccounts.join(', ')}`,
    props.collectedData.hasBrandVoice && 'Brand voice configured',
  ].filter(Boolean);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{props.title}</h3>
      <p className="text-muted-foreground">{props.message}</p>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Already collected:</h4>
        <ul className="space-y-1">
          {collectedItems.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="size-4 text-success" weight="fill" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={() => props.onConfirm?.()} className="flex-1">
          Continue to {formatStepName(props.nextStep)}
        </Button>
        <Button variant="outline" onClick={() => props.onEdit?.()}>
          Edit Info
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Library definitions (for @openuidev/react-lang)
// ---------------------------------------------------------------------------

const AccountConnectionCard = defineComponent({
  name: 'AccountConnectionCard',
  props: AccountConnectionCardSchema,
  description: 'Card showing a social platform with connect/disconnect button',
  component: ({ props }: ComponentRenderProps<z.infer<typeof AccountConnectionCardSchema>>): ReactNode => {
    return <AccountConnectionCardComponent {...props} />;
  },
});

const ProfileSummaryCard = defineComponent({
  name: 'ProfileSummaryCard',
  props: ProfileSummaryCardSchema,
  description: 'Card displaying user profile analysis results',
  component: ({ props }: ComponentRenderProps<z.infer<typeof ProfileSummaryCardSchema>>): ReactNode => {
    return <ProfileSummaryCardComponent {...props} />;
  },
});

const StepIndicator = defineComponent({
  name: 'StepIndicator',
  props: StepIndicatorSchema,
  description: 'Progress indicator showing current onboarding step',
  component: ({ props }: ComponentRenderProps<z.infer<typeof StepIndicatorSchema>>): ReactNode => {
    return <StepIndicatorComponent {...props} />;
  },
});

const OnboardingForm = defineComponent({
  name: 'OnboardingForm',
  props: OnboardingFormSchema,
  description: 'A multi-step form for collecting user onboarding information',
  component: ({ props }: ComponentRenderProps<z.infer<typeof OnboardingFormSchema>>): ReactNode => {
    return <OnboardingFormComponent {...props} />;
  },
});

const BrandVoicePreview = defineComponent({
  name: 'BrandVoicePreview',
  props: BrandVoicePreviewSchema,
  description: 'Preview of brand voice with sample posts and accept/regenerate actions',
  component: ({ props }: ComponentRenderProps<z.infer<typeof BrandVoicePreviewSchema>>): ReactNode => {
    return <BrandVoicePreviewComponent {...props} />;
  },
});

const CompletionCelebration = defineComponent({
  name: 'CompletionCelebration',
  props: CompletionCelebrationSchema,
  description: 'Celebration card shown when onboarding is complete',
  component: ({ props }: ComponentRenderProps<z.infer<typeof CompletionCelebrationSchema>>): ReactNode => {
    return <CompletionCelebrationComponent {...props} />;
  },
});

const AudienceSummary = defineComponent({
  name: 'AudienceSummary',
  props: AudienceSummarySchema,
  description: 'Structured summary of the defined target audience',
  component: ({ props }: ComponentRenderProps<z.infer<typeof AudienceSummarySchema>>): ReactNode => {
    return <AudienceSummaryComponent {...props} />;
  },
});

const ResumeSummary = defineComponent({
  name: 'ResumeSummary',
  props: ResumeSummarySchema,
  description: 'Shows a summary of already-collected onboarding data when resuming',
  component: ({ props }: ComponentRenderProps<z.infer<typeof ResumeSummarySchema>>): ReactNode => {
    return <ResumeSummaryComponent {...props} />;
  },
});

export const onboardingLibrary: Library = createLibrary({
  components: [
    OnboardingForm,
    AccountConnectionCard,
    ProfileSummaryCard,
    StepIndicator,
    BrandVoicePreview,
    CompletionCelebration,
    AudienceSummary,
    ResumeSummary,
  ],
});

// ---------------------------------------------------------------------------
// Registry: maps component type strings to React renderers with callbacks
// ---------------------------------------------------------------------------

interface ComponentEntry {
  render: (props: Record<string, unknown>, callbacks: OpenUICallbacks) => ReactNode;
}

const componentRegistry: Record<string, ComponentEntry> = {
  AccountConnectionCard: {
    render: (props, callbacks) => (
      <AccountConnectionCardComponent
        platform={props.platform as string}
        status={props.status as 'disconnected' | 'connecting' | 'connected' | 'error'}
        onConnect={callbacks.onConnectPlatform ? () => callbacks.onConnectPlatform!(props.platform as string) : undefined}
      />
    ),
  },
  ProfileSummaryCard: {
    render: (props) => (
      <ProfileSummaryCardComponent
        tone={props.tone as string}
        postTypes={(props.postTypes as Record<string, number>) ?? {}}
        imageAnalysis={(props.imageAnalysis as { categories: string[]; imageFrequency: number }) ?? { categories: [], imageFrequency: 0 }}
        audienceInsights={(props.audienceInsights as string[]) ?? []}
      />
    ),
  },
  StepIndicator: {
    render: (props) => (
      <StepIndicatorComponent
        currentStep={(props.currentStep as number) ?? 0}
        totalSteps={(props.totalSteps as number) ?? 0}
        stepLabels={(props.stepLabels as string[]) ?? []}
      />
    ),
  },
  OnboardingForm: {
    render: (props, callbacks) => (
      <OnboardingFormComponent
        title={props.title as string}
        fields={props.fields as Array<{ name: string; label: string; type: 'text' | 'email' | 'textarea' | 'select'; placeholder?: string; options?: string[] }>}
        formName={props.formName as string | undefined}
        onSubmit={callbacks.onFormSubmit ? (data) => callbacks.onFormSubmit!(props.formName as string ?? 'default', data) : undefined}
      />
    ),
  },
  BrandVoicePreview: {
    render: (props, callbacks) => (
      <BrandVoicePreviewComponent
        samplePosts={props.samplePosts as Array<{ platform: string; content: string }>}
        voiceDescription={props.voiceDescription as string | undefined}
        onRegenerate={callbacks.onBrandVoiceRegenerate}
        onAccept={callbacks.onBrandVoiceAccept}
      />
    ),
  },
  CompletionCelebration: {
    render: (props, callbacks) => (
      <CompletionCelebrationComponent
        accomplishments={props.accomplishments as string[]}
        onGoToDashboard={callbacks.onGoToDashboard}
      />
    ),
  },
  AudienceSummary: {
    render: (props) => (
      <AudienceSummaryComponent
        demographics={props.demographics as string | undefined}
        interests={props.interests as string[] | undefined}
        painPoints={props.painPoints as string[] | undefined}
      />
    ),
  },
  ResumeSummary: {
    render: (props, callbacks) => (
      <ResumeSummaryComponent
        title={props.title as string}
        message={props.message as string}
        collectedData={(props.collectedData as { name?: string; businessType?: string; industry?: string; audience?: string; goals?: string; connectedAccounts?: string[]; hasBrandVoice?: boolean }) ?? {}}
        nextStep={props.nextStep as string}
        onConfirm={callbacks.onConfirm}
        onEdit={callbacks.onEdit}
      />
    ),
  },
};

/**
 * Render a generative UI component by type string, using the registry.
 * Returns a visible error fallback for unknown types.
 */
export function renderOpenUIComponent(
  type: string,
  props: Record<string, unknown>,
  callbacks: OpenUICallbacks = {},
): ReactNode {
  const entry = componentRegistry[type];
  if (!entry) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        Unknown component type: <code className="font-mono">{type}</code>
      </div>
    );
  }
  return entry.render(props, callbacks);
}
