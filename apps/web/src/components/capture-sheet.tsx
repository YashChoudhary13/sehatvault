"use client";

import { useRef, useCallback } from "react";
import { Camera, Image, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (files: File[]) => void;
}

const OPTIONS = [
  {
    id: "camera",
    label: "Camera",
    icon: Camera,
    inputProps: {
      type: "file" as const,
      accept: "image/*",
      capture: "environment",
    },
  },
  {
    id: "gallery",
    label: "Gallery",
    icon: Image,
    inputProps: {
      type: "file" as const,
      accept: "image/*",
      multiple: true,
    },
  },
  {
    id: "pdf",
    label: "PDF",
    icon: FileText,
    inputProps: {
      type: "file" as const,
      accept: "application/pdf,.pdf",
      multiple: true,
    },
  },
] as const;

export function CaptureSheet({
  open,
  onOpenChange,
  onCapture,
}: CaptureSheetProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const refs = { camera: cameraRef, gallery: galleryRef, pdf: pdfRef };

  const handleSelect = useCallback(
    (id: (typeof OPTIONS)[number]["id"]) => {
      const input = refs[id].current;
      if (!input) return;
      const files = Array.from(input.files ?? []);
      if (files.length === 0) return;
      onCapture(files);
      onOpenChange(false);
      input.value = "";
    },
    [onCapture, onOpenChange]
  );

  const triggerInput = (id: (typeof OPTIONS)[number]["id"]) => {
    refs[id].current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md fixed bottom-0 left-0 right-0 m-0",
          "max-h-[80vh] rounded-t-2xl rounded-b-none",
          "flex flex-col gap-6 p-6 pb-8",
          "bg-surface shadow-lg",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
        )}
      >
        <p className="text-center text-sm font-semibold text-primary-ink">
          Upload Document
        </p>

        <div className="flex flex-col gap-3">
          {OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={() => triggerInput(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  triggerInput(id);
                }
              }}
              className={cn(
                "flex min-h-[48px] items-center gap-4 rounded-lg border border-border",
                "bg-bg px-4 py-3 text-left",
                "transition-transform duration-160 active:scale-[0.98]",
                "hover:bg-muted/30 cursor-pointer"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="flex-1 text-sm font-medium text-ink">{label}</span>
              <svg
                className="h-4 w-4 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={() => handleSelect("camera")}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={() => handleSelect("gallery")}
        />
        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={() => handleSelect("pdf")}
        />

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}