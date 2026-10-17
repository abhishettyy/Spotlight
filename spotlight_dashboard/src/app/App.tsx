import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "motion/react";
import { FB, View, AuthTab, PageFallback } from "./dashboard/shared";
import { LandingPage } from "./dashboard/LandingPage";

// The landing page ships with the first load; sign-in and the dashboard are downloaded when needed
const AuthPage = lazy(() => import("./dashboard/AuthPage").then(m => ({ default: m.AuthPage })));
const DashboardPage = lazy(() => import("./dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));

export default function App() {
  const [localToken, setLocalToken] = useState<string | null>(() => localStorage.getItem("spotlight_token"));
  const isLocalSignedIn = !!localToken;
  const isSignedIn = isLocalSignedIn;

  const getInitialParams = () => {
    if (typeof window === "undefined") return { view: "landing" as View, authTab: "login" as AuthTab, error: null as string | null };
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    let v = (params.get("view") as View);
    let t = (params.get("authTab") as AuthTab) || "login";

    const isSsoCallback = path.includes("sso-callback");
    if (isSsoCallback) {
      if (!v) v = "auth";
      if (!params.get("authTab")) t = "login";
    }

    if (!v) v = "landing";
    const hasLocalToken = !!localStorage.getItem("spotlight_token");
    const err = (params.get("noClub") || (isSsoCallback && !hasLocalToken))
      ? "No club exists with this mail id"
      : null;

    if (hasLocalToken && v !== "auth") return { view: "dashboard" as View, authTab: t, error: err };
    return { view: v, authTab: t, error: err };
  };

  const initial = getInitialParams();
  const [view,      setView]      = useState<View>(initial.view);
  const [authTab,   setAuthTab]   = useState<AuthTab>(initial.authTab);
  const [authError, setAuthError] = useState<string | null>(initial.error);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname.includes("sso-callback")) {
      const params = new URLSearchParams(window.location.search);
      const hasLocalToken = !!localStorage.getItem("spotlight_token");
      if (!hasLocalToken && !authError) {
        setAuthError("No club exists with this mail id");
      }
      if (!params.get("view") || !params.get("authTab")) {
        const url = new URL(window.location.href);
        url.searchParams.set("view", "auth");
        url.searchParams.set("authTab", "login");
        window.history.replaceState({ view: "auth", authTab: "login" }, "", url.toString());
      }
    }
  }, []);

  const updateNavigation = (newView: View, newAuthTab?: AuthTab) => {
    setView(newView);
    if (newAuthTab) setAuthTab(newAuthTab);

    const url = new URL(window.location.href);
    if (newView === "landing") {
      url.search = "";
    } else {
      url.searchParams.set("view", newView);
      if (newView === "auth" && (newAuthTab || authTab)) {
        url.searchParams.set("authTab", newAuthTab || authTab);
      } else {
        url.searchParams.delete("authTab");
      }

      if (newView === "dashboard") {
        const tab = url.searchParams.get("tab") || "overview";
        url.searchParams.set("tab", tab);
      } else {
        url.searchParams.delete("tab");
        url.searchParams.delete("eventId");
        url.searchParams.delete("showTeams");
      }
    }

    const currentParams = new URLSearchParams(window.location.search);
    const hasChanged = newView === "landing"
      ? currentParams.toString() !== ""
      : currentParams.get("view") !== newView || 
        (newView === "auth" && currentParams.get("authTab") !== (newAuthTab || authTab));

    if (hasChanged) {
      window.history.pushState({ view: newView, authTab: newAuthTab || authTab }, "", url.toString());
    }
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.view) {
        setView(state.view);
        if (state.authTab) setAuthTab(state.authTab);
      } else {
        const params = new URLSearchParams(window.location.search);
        const v = (params.get("view") as View) || "landing";
        const t = (params.get("authTab") as AuthTab) || "login";
        setView(v);
        setAuthTab(t);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isSignedIn && (view === "auth" || view === "landing")) {
      updateNavigation("dashboard");
    }
  }, [isSignedIn, view]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    document.body.style.overflow = (view === "dashboard" && isMobile) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [view]);

  const goAuth    = (tab: AuthTab = "login") => { updateNavigation("auth", tab); };
  const doSignOut = async () => {
    document.body.style.overflow = "";
    localStorage.removeItem("spotlight_token");
    localStorage.removeItem("spotlight_profile");
    setLocalToken(null);
    const url = new URL(window.location.href);
    url.search = "";
    window.history.pushState({ view: "landing" }, "", url.toString());
    setView("landing");
  };

  const userEmail = (() => {
    try {
      const profileRaw = localStorage.getItem("spotlight_profile");
      return profileRaw ? JSON.parse(profileRaw).email : "";
    } catch {
      return "";
    }
  })();

  return (
    <div className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: FB }}
    >
      {/* Liquid blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {view === "landing" && <LandingPage onEnter={() => isSignedIn ? updateNavigation("dashboard") : goAuth("login")} onRegister={() => goAuth("register")} />}
      {view === "auth"    && (
        <Suspense fallback={<PageFallback />}>
        <AuthPage
          tab={authTab} 
          onTabChange={(t) => { setAuthError(null); setAuthTab(t); }} 
          onBack={() => updateNavigation("landing")} 
          onLocalSignIn={(token, profile) => {
            localStorage.setItem("spotlight_token", token);
            localStorage.setItem("spotlight_profile", JSON.stringify(profile));
            setLocalToken(token);
          }}
          initialError={authError}
        />
        </Suspense>
      )}
      {(view === "dashboard" || (isSignedIn && view !== "auth" && view !== "landing")) && (
      <motion.div key="dash" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="dashboard-root"
        >
          <Suspense fallback={<PageFallback />}>
            <DashboardPage userEmail={userEmail} onSignOut={doSignOut} />
          </Suspense>
        </motion.div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; }
        .dashboard-root { height: 100dvh; overflow: hidden; }
        @media (min-width: 768px) { .dashboard-root { height: auto; min-height: 100vh; overflow: visible; } }
        .blob {
          position: absolute; border-radius: 50%;
          filter: blur(100px); opacity: 0.08; will-change: transform;
          animation: morphBlob 22s ease-in-out infinite;
        }
        .blob-1 { width:750px; height:750px; background: radial-gradient(circle,color-mix(in srgb, var(--sk-brand) 15%, transparent),transparent 68%); top:-18%; left:-20%; animation-duration:20s; }
        .blob-2 { width:580px; height:580px; background: radial-gradient(circle,rgba(160,160,160,.25),transparent 68%); bottom:0; right:-14%; animation-duration:26s; animation-delay:-9s; }
        .blob-3 { width:440px; height:440px; background: radial-gradient(circle,color-mix(in srgb, var(--sk-brand) 10%, transparent),transparent 68%); top:42%; left:38%; animation-duration:32s; animation-delay:-16s; }
        html.light .blob { opacity: 0.12; }
        html.light .blob-1 { background: radial-gradient(circle,color-mix(in srgb, var(--sk-brand) 12%, transparent),transparent 68%); }
        html.light .blob-2 { background: radial-gradient(circle,rgba(200,205,215,.35),transparent 68%); }
        html.light .blob-3 { background: radial-gradient(circle,color-mix(in srgb, var(--sk-brand) 8%, transparent),transparent 68%); }
        @keyframes morphBlob {
          0%,100% { transform:translate(0,0) scale(1);          border-radius:60% 40% 70% 30%/50% 60% 40% 70%; }
          25%      { transform:translate(55px,-44px) scale(1.07); border-radius:40% 60% 30% 70%/60% 40% 70% 30%; }
          50%      { transform:translate(-32px,65px) scale(.93);  border-radius:70% 30% 50% 50%/30% 70% 50% 60%; }
          75%      { transform:translate(42px,28px) scale(1.04);  border-radius:50% 50% 60% 40%/70% 30% 60% 40%; }
        }
        @keyframes beamSweep {
          0%,100% { transform:translateX(-50%) rotate(-6deg); opacity:.55; }
          50%      { transform:translateX(-50%) rotate(6deg);  opacity:1;   }
        }
      `}</style>
    </div>
  );
}
