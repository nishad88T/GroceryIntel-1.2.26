import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const providerLabels = {
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  azure: "Azure"
};

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

const normalizePostAuthPath = (requestedPath) => {
  if (!requestedPath || blockedPostAuthPaths.has(requestedPath)) {
    return "/dashboard";
  }
  return requestedPath;
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const next = useMemo(() => {
    const requested = searchParams.get("next");
    if (!requested) return normalizePostAuthPath("/dashboard");
    try {
      const decoded = decodeURIComponent(requested);
      const normalized = decoded.startsWith(window.location.origin)
        ? decoded.replace(window.location.origin, "") || "/dashboard"
        : "/dashboard";
      return normalizePostAuthPath(normalized);
    } catch {
      return normalizePostAuthPath("/dashboard");
    }
  }, [searchParams]);

  const oauthProviders = appClient.auth.getOAuthProviders();

  const callbackUrl = useMemo(() => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, [next]);

  const finishAuth = () => {
    navigate(next);
  };

  const onPasswordLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await appClient.auth.signInWithPassword({ email, password });
      finishAuth();
    } catch (authError) {
      setError(authError.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPasswordSignup = async () => {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const { user, session } = await appClient.auth.signUpWithPassword({ email, password, emailRedirectTo: callbackUrl });
      if (session) {
        finishAuth();
        return;
      }
      if (user) {
        setMessage("Account created. Check your inbox to confirm your email before logging in.");
      }
    } catch (authError) {
      setError(authError.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onMagicLink = async () => {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await appClient.auth.signInWithOtp({
        email,
        emailRedirectTo: callbackUrl
      });
      setMessage("Magic link sent. Check your inbox to continue.");
    } catch (authError) {
      setError(authError.message || "Unable to send magic link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOAuth = async (provider) => {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await appClient.auth.signInWithOAuth({
        provider,
        redirectTo: callbackUrl
      });
    } catch (authError) {
      setError(authError.message || `Unable to sign in with ${provider}.`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login or Sign up</CardTitle>
          <CardDescription>
            Email/password works by default with Supabase. OAuth buttons only appear when enabled. Email links return to this deployment automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={onPasswordLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

            <div className="grid grid-cols-1 gap-2">
              <Button type="submit" disabled={isSubmitting}>Log in</Button>
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onPasswordSignup}>
                Create account
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onMagicLink}>
                Send magic link
              </Button>
            </div>
          </form>

          {oauthProviders.length > 0 ? (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs text-slate-500">Optional OAuth</p>
              {oauthProviders.map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={() => onOAuth(provider)}
                >
                  Continue with {providerLabels[provider] || provider}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
