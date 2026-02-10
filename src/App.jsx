import "./App.css";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import VisualEditAgent from "@/lib/VisualEditAgent";
import NavigationTracker from "@/lib/NavigationTracker";
import { appClient } from "@/api/appClient";
import { pagesConfig } from "./pages.config";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const DashboardPage = Pages.Dashboard ?? MainPage;

const PUBLIC_ROUTES = [
  { key: "Home", path: "/home" },
  { key: "Features", path: "/features" },
  { key: "Pricing", path: "/pricing" },
  { key: "FAQs", path: "/faqs" },
  { key: "About", path: "/about" },
  { key: "Guide", path: "/guide" },
  { key: "Privacy", path: "/privacy" },
  { key: "TermsOfUse", path: "/terms-of-use" },
  { key: "CookiePolicy", path: "/cookie-policy" },
  { key: "LandingPage", path: "/landing" },
  { key: "PublicLanding", path: "/public-landing" },
  { key: "InstagramMarketing", path: "/instagram-marketing" },
  { key: "JoinHousehold", path: "/joinhousehold" },
];

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const LoginRedirect = () => {
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    appClient.auth.redirectToLogin(window.location.href).catch((error) => {
      console.error("Failed to start auth redirect:", error);
      setShowEmailAuth(true);
      setStatus(error?.message || "Sign-in redirect failed");
    });
  }, []);

  const handleSignIn = async () => {
    try {
      setStatus("Signing in...");
      await appClient.auth.signInWithPassword({ email, password });
      setStatus("Signed in. Reloading...");
      window.location.reload();
    } catch (error) {
      setStatus(error?.message || "Sign in failed");
    }
  };

  const handleSignUp = async () => {
    try {
      setStatus("Creating account...");
      await appClient.auth.signUpWithPassword({ email, password });
      setStatus("Check your email for confirmation (if enabled), then sign in.");
    } catch (error) {
      setStatus(error?.message || "Sign up failed");
    }
  };

  if (showEmailAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm space-y-3">
          <h1 className="text-xl font-semibold">Sign in to GroceryIntel</h1>
          <p className="text-sm text-slate-500">OAuth provider is not enabled. Use email/password below.</p>
          <input className="w-full border rounded px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={handleSignIn}>Sign in</button>
            <button className="px-4 py-2 rounded border" onClick={handleSignUp}>Sign up</button>
          </div>
          {status ? <p className="text-sm text-slate-600">{status}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="text-sm text-slate-600">Redirecting to sign-in...</div>
    </div>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  // Loading spinner while checking Supabase session
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not signed in: show PublicLanding for any route
  if (!isAuthenticated) {
    const Public = Pages.PublicLanding ?? Pages.LandingPage ?? Pages.Home ?? (() => null);
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<LoginRedirect />} />
        <Route path="/Dashboard" element={<LoginRedirect />} />
        {PUBLIC_ROUTES.map(({ key, path }) => {
          const Page = Pages[key];
          return Page ? <Route key={path} path={path} element={<Page />} /> : null;
        })}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  // Signed in: render full app routes
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard"
        element={
          <LayoutWrapper currentPageName="Dashboard">
            <DashboardPage />
          </LayoutWrapper>
        }
      />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
