"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CaptureSheet } from "@/components/capture-sheet";
import { t, type Locale } from "@sehatvault/i18n";

interface MemberOption {
  id: string;
  display_name: string;
}

interface UploadSectionProps {
  members: MemberOption[];
  locale: Locale;
}

export function UploadSection({ members, locale }: UploadSectionProps) {
  const router = useRouter();

  const autoMember =
    members.length === 1 ? members[0]?.id ?? "" : "";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [memberId, setMemberId] = useState(autoMember);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleCapture(files: File[]) {
    setPendingFiles(files);
    setUploadError(null);
    setMemberId(autoMember || (members[0]?.id ?? ""));
    setPickerOpen(true);
    setSheetOpen(false);
  }

  async function handleUpload() {
    if (!pendingFiles || !memberId || !pendingFiles[0]) return;
    setUploading(true);
    setUploadError(null);

    const file = pendingFiles[0]!;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("member_id", memberId);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(
          json.error ?? t(locale, "records.upload.error.network"),
        );
        return;
      }
      setPickerOpen(false);
      setPendingFiles(null);
      router.refresh();
    } catch {
      setUploadError(t(locale, "records.upload.error.network"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setSheetOpen(true)} className="w-full gap-2">
        <UploadCloud className="h-4 w-4" />
        {t(locale, "records.upload.trigger")}
      </Button>

      <CaptureSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCapture={handleCapture}
      />

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(locale, "records.upload.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {pendingFiles && (
              <p className="text-sm text-ink">
                Selected:{" "}
                <span className="font-medium">{pendingFiles[0]!.name}</span>
                {pendingFiles.length > 1 &&
                  ` +${pendingFiles.length - 1} more`}
              </p>
            )}

            {members.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">
                  Family member{" "}
                  <span className="text-danger" aria-hidden>*</span>
                </label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a member" />
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
            )}

            {uploadError && (
              <p
                role="alert"
                className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {uploadError}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={uploading}
                onClick={() => {
                  setPickerOpen(false);
                  setPendingFiles(null);
                }}
              >
                {t(locale, "records.upload.cancel")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={uploading || !memberId || !pendingFiles}
                onClick={handleUpload}
              >
                {uploading
                  ? t(locale, "records.upload.uploading")
                  : t(locale, "records.upload.upload")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}