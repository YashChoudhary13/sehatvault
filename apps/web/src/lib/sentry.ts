// Sentry wiring placeholder. Full @sentry/nextjs integration lands in hardening (backlog E9).
// Kept dependency-free so PR1 builds without a DSN.
export function initObservability(): void {
  if (process.env.SENTRY_DSN) {
    // TODO(E9): Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
  }
}
