"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { t } from "@sehatvault/i18n";

// Email OTP flow (ADR-019): send a 6-digit code, then verify it. No SMS/phone.
// Locale is hardcoded to "en" until locale switching lands (Sprint 2 #5 / i18n wiring).
const LOCALE = "en" as const;

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) setError(error.message);
    else router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-primary-ink">{t(LOCALE, "auth.login.title")}</h1>
        <p className="text-sm text-muted">
          {step === "email" ? t(LOCALE, "auth.login.subtitle") : t(LOCALE, "auth.login.codeSent")}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t(LOCALE, "auth.login.emailLabel")}</span>
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
          <Button type="submit" disabled={loading || !email} className="w-full">
            {loading ? "…" : t(LOCALE, "auth.login.sendCode")}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t(LOCALE, "auth.login.codeLabel")}</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <Button type="submit" disabled={loading || code.length < 6} className="w-full">
            {loading ? "…" : t(LOCALE, "auth.login.verify")}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="w-full text-sm text-muted underline"
          >
            {t(LOCALE, "auth.login.changeEmail")}
          </button>
        </form>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </main>
  );
}
