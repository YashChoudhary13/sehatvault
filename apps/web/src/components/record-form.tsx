"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createRecord,
  type CreateRecordData,
  type RecordActionResult,
} from "@/app/actions/record";
import { t, type Locale } from "@sehatvault/i18n";

const RECORD_TYPES: { value: CreateRecordData["type"]; label: string }[] = [
  { value: "prescription", label: "Prescription" },
  { value: "lab_report", label: "Lab Report" },
  { value: "scan", label: "Scan" },
  { value: "discharge", label: "Discharge" },
  { value: "vaccination", label: "Vaccination" },
  { value: "bill", label: "Bill" },
  { value: "other", label: "Document" },
];

type Member = { id: string; display_name: string };

type RecordFormInitialData = {
  member_id?: string;
  type?: CreateRecordData["type"];
  record_date?: string;
  title?: string;
  facility?: string;
  doctor?: string;
  summary?: string;
};

interface RecordFormProps {
  locale: Locale;
  members: Member[];
  defaultDate: string;
  initialData?: RecordFormInitialData;
  onSubmit?: (data: CreateRecordData) => Promise<RecordActionResult>;
  readOnlyMember?: boolean;
}

export function RecordForm({
  locale,
  members,
  defaultDate,
  initialData,
  onSubmit,
  readOnlyMember,
}: RecordFormProps) {
  const [memberId, setMemberId] = useState(
    initialData?.member_id ?? members[0]?.id ?? "",
  );
  const [type, setType] = useState<CreateRecordData["type"]>(
    initialData?.type ?? "prescription",
  );
  const [recordDate, setRecordDate] = useState(
    initialData ? (initialData.record_date ?? "") : defaultDate,
  );
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [facility, setFacility] = useState(initialData?.facility ?? "");
  const [doctor, setDoctor] = useState(initialData?.doctor ?? "");
  const [summary, setSummary] = useState(initialData?.summary ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitFn: (data: CreateRecordData) => Promise<RecordActionResult> =
    onSubmit ?? createRecord;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitFn({
        member_id: memberId,
        type,
        record_date: recordDate,
        title,
        facility: facility || undefined,
        doctor: doctor || undefined,
        summary: summary || undefined,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label>{t(locale, "records.action.member_label")}</Label>
        <Select
          value={memberId}
          onValueChange={setMemberId}
          required
          disabled={readOnlyMember}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t(locale, "records.upload.select_member")}
            />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t(locale, "records.action.type_label")}</Label>
        <Select
          value={type}
          onValueChange={(v) => setType(v as CreateRecordData["type"])}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECORD_TYPES.map((rt) => (
              <SelectItem key={rt.value} value={rt.value}>
                {rt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t(locale, "records.action.date_label")}</Label>
        <Input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t(locale, "records.action.title_label")}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(locale, "records.detail.untitled")}
          maxLength={255}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t(locale, "records.action.facility_label")}</Label>
        <Input
          value={facility}
          onChange={(e) => setFacility(e.target.value)}
          maxLength={255}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t(locale, "records.action.doctor_label")}</Label>
        <Input
          value={doctor}
          onChange={(e) => setDoctor(e.target.value)}
          maxLength={255}
        />
      </div>

      <div className="space-y-1.5">
        <Label>
          {t(locale, "records.action.summary_label")}
          <span className="ml-1 text-xs text-muted">(optional)</span>
        </Label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending || !memberId}>
          {isPending
            ? t(locale, "records.action.saving")
            : t(locale, "records.action.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => history.back()}
          disabled={isPending}
        >
          {t(locale, "records.action.cancel")}
        </Button>
      </div>
    </form>
  );
}
