"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Bell, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/records", labelKey: "nav.records", icon: FileText },
  { href: "/reminders", labelKey: "nav.reminders", icon: Bell },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MainNav() {
  const pathname = usePathname();
  const translate = useT();

  return (
    <>
      {/* ── Mobile: fixed bottom tab bar ───────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active ? "stroke-[2.5]" : "stroke-2",
                )}
              />
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
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-bg hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    active ? "stroke-[2.5]" : "stroke-2",
                  )}
                />
                <span>{translate(labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
