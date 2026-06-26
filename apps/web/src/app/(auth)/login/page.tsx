"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { t } from "@sehatvault/i18n";

// Email magic-link flow (ADR-019): send a sign-in link via email, user clicks to authenticate.
// Uses Supabase's built-in email service — no custom SMTP needed.
// PKCE callback handled by /api/auth/callback route.
const LOCALE = "en" as const;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type Step = "email" | "sent";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function demoLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@sehatvault.dev",
      password: "Demo@SehatVault1",
    });
    setLoading(false);
    if (error) {
      setError("Demo login failed — make sure the demo account exists in Supabase.");
    } else {
      router.push("/home");
    }
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("sent");
    }
  }

  async function resend() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-primary-ink">
          {t(LOCALE, "auth.login.title")}
        </h1>
        <p className="text-sm text-muted">
          {step === "email"
            ? t(LOCALE, "auth.login.subtitle")
            : t(LOCALE, "auth.login.checkEmail")}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={sendLink} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">
              {t(LOCALE, "auth.login.emailLabel")}
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? "…" : t(LOCALE, "auth.login.sendLink")}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-4 text-center text-sm">
            <p className="text-muted">
              {t(LOCALE, "auth.login.linkSent")}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={resend}
            className="w-full"
          >
            {loading ? "…" : t(LOCALE, "auth.login.resend")}
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="w-full text-sm text-muted underline"
          >
            {t(LOCALE, "auth.login.changeEmail")}
          </button>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {DEMO_MODE && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-center text-xs text-muted">Dev only</p>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={demoLogin}
            className="w-full"
          >
            Continue as Demo
          </Button>
        </div>
      )}
    </main>
  );
}
