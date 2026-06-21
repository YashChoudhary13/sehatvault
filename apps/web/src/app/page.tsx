import { Button } from "@/components/ui/button";
import { appVersion } from "@sehatvault/core";
import { t } from "@sehatvault/i18n";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary-ink">{t("en", "app.name")}</h1>
        <p className="text-muted">{t("en", "app.tagline")}</p>
      </div>
      <div className="flex gap-3">
        <Button>Get started</Button>
        <Button variant="outline">Learn more</Button>
      </div>
      <p className="text-xs text-muted">Foundation v{appVersion()} · PR1 scaffold</p>
    </main>
  );
}
