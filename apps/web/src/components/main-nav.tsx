"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, Bell, MoreHorizontal, FileText, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

const MOBILE_NAV: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: Home },
  { href: "/members", labelKey: "nav.members", icon: Users },
  // center slot is the FAB — rendered separately
  { href: "/reminders", labelKey: "nav.reminders", icon: Bell },
  { href: "/settings", labelKey: "nav.settings", icon: MoreHorizontal },
];

const DESKTOP_NAV: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: Home },
  { href: "/members", labelKey: "nav.members", icon: Users },
  { href: "/records", labelKey: "nav.records", icon: FileText },
  { href: "/reminders", labelKey: "nav.reminders", icon: Bell },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

function isActive(href: string, pathname: string): boolean {
  return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
}

export function MainNav() {
  const pathname = usePathname();
  const translate = useT();

  const [left, right] = [MOBILE_NAV.slice(0, 2), MOBILE_NAV.slice(2)];

  return (
    <>
      {/* ── Mobile: fixed bottom tab bar with elevated center FAB ──────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-end border-t border-border bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Main navigation"
      >
        {/* left 2 tabs */}
        {left.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors motion-reduce:transition-none",
                active ? "text-primary" : "text-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", active ? "stroke-[2.5]" : "stroke-2")} />
              <span>{translate(labelKey)}</span>
            </Link>
          );
        })}

        {/* elevated + Add FAB */}
        <div className="flex flex-1 flex-col items-center pb-2">
          <Link
            href="/records"
            aria-label={translate("nav.add")}
            className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-accent shadow-lg transition-transform duration-150 ease-[var(--ease-out)] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <Plus className="h-7 w-7 stroke-[2.5] text-ink" />
          </Link>
        </div>

        {/* right 2 tabs */}
        {right.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors motion-reduce:transition-none",
                active ? "text-primary" : "text-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", active ? "stroke-[2.5]" : "stroke-2")} />
              <span>{translate(labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Desktop: fixed side rail ────────────────────────────────────────── */}
      <nav
        className="fixed left-0 top-0 hidden h-full w-56 flex-col border-r border-border bg-surface md:flex"
        aria-label="Main navigation"
      >
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <span className="text-lg font-bold text-primary-ink">SehatVault</span>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {DESKTOP_NAV.map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors motion-reduce:transition-none",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-bg hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "stroke-[2.5]" : "stroke-2")} />
                <span>{translate(labelKey)}</span>
              </Link>
            );
          })}
        </div>
        {/* Desktop + Add CTA */}
        <div className="border-t border-border p-3">
          <Link
            href="/records"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:brightness-95 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            {translate("nav.add")}
          </Link>
        </div>
      </nav>
    </>
  );
}
