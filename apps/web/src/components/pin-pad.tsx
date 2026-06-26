"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface PinPadProps {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function PinPad({
  value,
  onChange,
  maxLength = 6,
  autoFocus = false,
  disabled = false,
}: PinPadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="cursor-text space-y-4"
      onClick={() => inputRef.current?.focus()}
    >
      <div
        className="flex justify-center gap-3"
        aria-label={`PIN: ${value.length} of ${maxLength} digits entered`}
      >
        {Array.from({ length: maxLength }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 w-4 rounded-full border-2 transition-colors duration-150",
              i < value.length
                ? "border-primary bg-primary"
                : "border-border bg-transparent",
            )}
          />
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label="Enter PIN digits"
        className="sr-only"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, maxLength);
          onChange(digits);
        }}
      />
    </div>
  );
}
