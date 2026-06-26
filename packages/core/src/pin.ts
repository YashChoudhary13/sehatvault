export type PinValidationFailReason = "too_short" | "too_long" | "not_digits" | "trivial";

export type PinValidationResult =
  | { valid: true }
  | { valid: false; reason: PinValidationFailReason };

const DIGITS_RE = /^\d+$/;

function isTrivial(pin: string): boolean {
  if (new Set(pin).size === 1) return true;

  const digits = pin.split("").map(Number);

  const ascending = digits.every(
    (d, i) => i === 0 || d === (digits[i - 1] as number) + 1
  );
  if (ascending) return true;

  const descending = digits.every(
    (d, i) => i === 0 || d === (digits[i - 1] as number) - 1
  );
  return descending;
}

export function validatePin(pin: string): PinValidationResult {
  if (pin.length < 4) return { valid: false, reason: "too_short" };
  if (pin.length > 6) return { valid: false, reason: "too_long" };
  if (!DIGITS_RE.test(pin)) return { valid: false, reason: "not_digits" };
  if (isTrivial(pin)) return { valid: false, reason: "trivial" };
  return { valid: true };
}
