"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  /** Compact one-liner fallback for widget-level boundaries inside dashboard cards. */
  inline?: boolean;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] uncaught render error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.inline) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <span>Failed to render — </span>
          <button
            onClick={this.reset}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            try again
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-background p-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div className="space-y-1">
          <p className="font-semibold">Something went wrong on this page</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={this.reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    );
  }
}
