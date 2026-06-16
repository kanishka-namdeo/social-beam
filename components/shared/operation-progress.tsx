'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Spinner, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react/ssr';
import { cn } from '@/lib/utils';

interface OperationStep {
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

interface OperationProgressProps {
  title: string;
  description: string;
  progress: number; // 0-100
  steps: OperationStep[];
  status: 'running' | 'complete' | 'error' | 'idle';
  elapsedTime?: string;
  className?: string;
}

export function OperationProgress({
  title,
  description,
  progress,
  steps,
  status,
  elapsedTime,
  className,
}: OperationProgressProps) {
  const statusIcon = {
    running: <Spinner className="size-5 animate-spin text-brand" />,
    complete: <CheckCircle className="size-5 text-success" weight="fill" />,
    error: <WarningCircle className="size-5 text-destructive" weight="fill" />,
    idle: <Info className="size-5 text-muted-foreground" />,
  };

  const statusBadge = {
    running: <Badge variant="outline" className="bg-info/10 text-info border-info/20">In Progress</Badge>,
    complete: <Badge variant="outline" className="bg-success/10 text-success border-success/20">Complete</Badge>,
    error: <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Failed</Badge>,
    idle: <Badge variant="outline">Waiting</Badge>,
  };

  return (
    <Card className={cn('bg-ai-surface border-ai-surface-foreground/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusIcon[status]}
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {elapsedTime && (
              <span className="text-xs text-muted-foreground tabular-nums">{elapsedTime}</span>
            )}
            {statusBadge[status]}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {steps.length > 0 && (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 text-sm',
                  step.status === 'running' && 'text-ai-surface-foreground',
                  step.status === 'complete' && 'text-success',
                  step.status === 'error' && 'text-destructive',
                  step.status === 'pending' && 'text-muted-foreground',
                )}
              >
                {step.status === 'running' && <Spinner className="size-3 animate-spin" />}
                {step.status === 'complete' && <CheckCircle className="size-3" weight="fill" />}
                {step.status === 'error' && <WarningCircle className="size-3" weight="fill" />}
                {step.status === 'pending' && (
                  <div className="size-3 rounded-full border border-current" />
                )}
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
