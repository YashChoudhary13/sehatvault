import { Activity, FileText, Plus } from "lucide-react";
import { Button, Card, EmptyState, GradientField, Section } from "@sehatvault/ui";
import { MotionTierBox, Reveal } from "@sehatvault/ui/motion";

export default function DesignPreviewPage() {
  return (
    <main className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-ink)]">
      <Section className="relative overflow-hidden px-6 py-20">
        <GradientField variant="hero" />
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">Calm Indigo — design preview</h1>
        <p className="mt-3 max-w-lg text-[var(--color-muted)]">Elevation, gradient depth, motion tiers, and primitives.</p>
      </Section>

      <Section className="px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([1, 2, 3, 4] as const).map((e) => (
            <Card key={e} elevation={e} interactive className="p-5">
              <p className="text-sm text-[var(--color-muted)]">Elevation {e}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-lg">Card</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tint className="px-6 py-12">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary"><Plus className="h-4 w-4" /> With icon</Button>
        </div>
      </Section>

      <Section className="space-y-8 px-6 py-12">
        {(["calm", "standard", "expressive"] as const).map((tier) => (
          <MotionTierBox key={tier} tier={tier}>
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-[var(--color-primary)]" /> Motion tier: {tier}</p>
            </Card>
          </MotionTierBox>
        ))}
        <Reveal>
          <Card className="p-5"><p className="text-sm">Reveal on scroll (standard tier)</p></Card>
        </Reveal>
      </Section>

      <Section className="px-6 py-12">
        <EmptyState icon={FileText} title="No records yet" description="Add your first document to start the timeline." action={<Button>Add record</Button>} />
      </Section>
    </main>
  );
}
