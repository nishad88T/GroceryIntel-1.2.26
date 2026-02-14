import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const blockedPostAuthPaths = new Set([
  "/landing",
  "/public-landing",
  "/home",
  "/features",
  "/pricing",
  "/faqs",
  "/about",
  "/guide",
  "/privacy",
  "/terms-of-use",
  "/cookie-policy",
  "/login",
  "/auth/callback"
]);

const normalizeNextPath = (value) => {
  if (!value) return "/dashboard";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      const normalized = `${url.pathname}${url.search}${url.hash}` || "/dashboard";
      return blockedPostAuthPaths.has(url.pathname) ? "/dashboard" : normalized;
    } catch {
      return "/dashboard";
    }
  }
  const candidate = value.startsWith("/") ? value : "/dashboard";
  return blockedPostAuthPaths.has(candidate) ? "/dashboard" : candidate;
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Completing sign-in...");

  const next = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hashParams.get("error_description") || hashParams.get("error");

      if (hashError) {
        if (cancelled) return;
        setStatus("error");
        setMessage(hashError);
        return;
      }

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          if (cancelled) return;
          setStatus("error");
          setMessage(error.message || "Authentication failed. Please try again.");
          return;
        }

        if (data?.session) {
          if (cancelled) return;
          navigate(next, { replace: true });
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (!cancelled) {
        setStatus("error");
        setMessage("We could not finalize your sign-in link. Please request a new one.");
      }
    };

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, next]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Auth callback</CardTitle>
          <CardDescription>
            {status === "processing" ? "Please wait while we complete your sign-in." : "Authentication could not be completed."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className={`text-sm ${status === "error" ? "text-red-600" : "text-slate-700"}`}>{message}</p>
          {status === "error" ? (
            <Button type="button" className="w-full" onClick={() => navigate(`/login?next=${encodeURIComponent(next)}`)}>
              Back to login
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
