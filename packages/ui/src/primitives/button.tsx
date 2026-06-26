import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-ink)]",
  secondary: "bg-[var(--color-tint)] text-[var(--color-primary-ink)] hover:bg-[var(--color-border)]",
  ghost: "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-tint)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium",
        "transition-[transform,background-color,opacity] duration-[var(--motion-calm)] ease-[var(--ease-out)]",
        "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
}
