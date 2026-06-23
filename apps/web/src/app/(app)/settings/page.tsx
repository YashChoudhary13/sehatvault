import { PinSetup } from "@/components/pin-setup";
import { getHasPinSet } from "@/lib/pin-actions";

export default async function SettingsPage() {
  const hasPinSet = await getHasPinSet();
  return (
    <main className="mx-auto max-w-md space-y-8 p-6">
      <h1 className="text-2xl font-bold text-primary-ink">Settings</h1>
      <section className="rounded-lg border border-border bg-surface p-6">
        <PinSetup hasPinSet={hasPinSet} />
      </section>
    </main>
  );
}
