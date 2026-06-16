"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Warning, ArrowClockwise } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { getWidgetMeta } from "@/lib/dashboard/widget-registry";

interface Props {
  widgetId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`widget.render_error`, {
      widgetId: this.props.widgetId,
      error: String(error),
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const meta = getWidgetMeta(this.props.widgetId);
      return (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border bg-card p-6 text-center">
          <Warning weight="duotone" className="mb-2 size-8 text-destructive" />
          <p className="text-sm font-medium text-foreground">
            {meta?.name ?? this.props.widgetId} failed to load
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred"}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset} className="mt-3">
            <ArrowClockwise weight="bold" className="mr-1.5 size-3" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
