"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("ChatErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive max-w-md">
            <strong>Chat error:</strong> {this.state.error.message}
          </div>
          <Button
            variant="outline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
