import { StrictMode, useEffect, useState } from "react";
import type { Root } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import AdminConsole from "./AdminConsole.tsx";
import { ThemeProvider } from "./theme.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { isAdminPath } from "./siteNavigation.ts";
import "../styles/index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function SiteRoot() {
  const [isAdmin, setIsAdmin] = useState(isAdminPath);

  useEffect(() => {
    const onPopState = () => setIsAdmin(isAdminPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return isAdmin ? <AdminConsole /> : <App />;
}

export function mountDashboard(root: Root) {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <ThemeProvider>
            <SiteRoot />
          </ThemeProvider>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
