import { StrictMode } from "react";
import type { Root } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import AdminConsole from "./AdminConsole.tsx";
import { ThemeProvider } from "./theme.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "../styles/index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/** Renders the club dashboard, or the admin console on /admin. */
export function mountDashboard(root: Root, isAdminRoute: boolean) {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <ThemeProvider>
            {isAdminRoute ? <AdminConsole /> : <App />}
          </ThemeProvider>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
