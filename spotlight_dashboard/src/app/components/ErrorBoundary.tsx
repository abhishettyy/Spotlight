import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    // Clear URL query parameters that might have caused the error (e.g. invalid eventId)
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "24px",
          textAlign: "center"
        }}>
          <div style={{
            maxWidth: "480px",
            width: "100%",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "24px",
            padding: "36px 28px",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(240, 61, 78, 0.12)",
              border: "1px solid rgba(240, 61, 78, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
              color: "#F03D4E",
              fontSize: "24px",
              fontWeight: "bold"
            }}>
              !
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px", lineHeight: "1.5" }}>
              An unexpected display issue occurred in this view. Click below to refresh and return to safety.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                background: "#F03D4E",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "12px 24px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#d83544")}
              onMouseLeave={e => (e.currentTarget.style.background = "#F03D4E")}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
