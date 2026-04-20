import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { ErrorScreen } from "./ErrorScreen";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorCode?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    const errorCode = error instanceof Error ? error.name : "UnknownError";
    return { hasError: true, errorCode };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorCode: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          onRetry={this.handleRetry}
          errorCode={this.state.errorCode}
        />
      );
    }
    return this.props.children;
  }
}
