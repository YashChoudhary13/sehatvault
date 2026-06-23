"use client";

import { useState, type FormEvent } from "react";
import { validatePin } from "@sehatvault/core";
import { setAppLockPin, clearAppLockPin } from "@/lib/pin-actions";
import { PinPad } from "@/components/pin-pad";
import { Button } from "@/components/ui/button";
import { t } from "@sehatvault/i18n";

const LOCALE = "en" as const;

type SetupStep = "enter" | "confirm";
type SetupMode = "setup" | "idle";

interface PinSetupProps {
  hasPinSet: boolean;
  onDone?: () => void;
}

export function PinSetup({ hasPinSet, onDone }: PinSetupProps) {
  const [mode, setMode] = useState<SetupMode>(hasPinSet ? "idle" : "setup");
  const [step, setStep] = useState<SetupStep>("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setPin("");
    setConfirmPin("");
    setError(null);
    setStep("enter");
  }

  async function handleClear() {
    if (!window.confirm(t(LOCALE, "pin.setup.clearConfirm"))) return;
    setLoading(true);
    const result = await clearAppLockPin();
    setLoading(false);
    if (result.ok) {
      setMessage(t(LOCALE, "pin.setup.cleared"));
      resetForm();
      setMode("setup");
    } else {
      setError(result.error);
    }
  }

  function handleEnterSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const validation = validatePin(pin);
    if (!validation.valid) {
      setError(t(LOCALE, `pin.error.${validation.reason}`));
      return;
    }
    setStep("confirm");
  }

  async function handleConfirmSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin !== confirmPin) {
      setError(t(LOCALE, "pin.setup.mismatch"));
      setConfirmPin("");
      return;
    }
    setLoading(true);
    const result = await setAppLockPin(pin);
    setLoading(false);
    if (result.ok) {
      setMessage(t(LOCALE, "pin.setup.success"));
      resetForm();
      setMode("idle");
      onDone?.();
    } else {
      setError(t(LOCALE, `pin.error.${result.error}`) ?? result.error);
      setConfirmPin("");
    }
  }

  if (mode === "idle") {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-primary-ink">
            {t(LOCALE, "pin.setup.title")}
          </h2>
          <p className="text-sm text-muted">{t(LOCALE, "pin.setup.subtitle")}</p>
        </div>
        {message ? <p className="text-sm text-success">{message}</p> : null}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setMode("setup");
              setMessage(null);
            }}
          >
            Change PIN
          </Button>
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={loading}
            className="text-danger"
          >
            {t(LOCALE, "pin.setup.clear")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-primary-ink">
          {t(LOCALE, "pin.setup.title")}
        </h2>
        <p className="text-sm text-muted">{t(LOCALE, "pin.setup.subtitle")}</p>
      </div>

      {step === "enter" ? (
        <form onSubmit={handleEnterSubmit} className="space-y-6">
          <label className="block space-y-3">
            <span className="text-sm font-medium">{t(LOCALE, "pin.setup.enter")}</span>
            <PinPad value={pin} onChange={setPin} maxLength={6} autoFocus />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pin.length < 4}>
            Next
          </Button>
        </form>
      ) : (
        <form onSubmit={handleConfirmSubmit} className="space-y-6">
          <label className="block space-y-3">
            <span className="text-sm font-medium">{t(LOCALE, "pin.setup.confirm")}</span>
            <PinPad value={confirmPin} onChange={setConfirmPin} maxLength={6} autoFocus />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || confirmPin.length < 4}
          >
            {loading ? "…" : t(LOCALE, "pin.setup.set")}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("enter");
              setConfirmPin("");
              setError(null);
            }}
            className="w-full text-sm text-muted underline"
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}
