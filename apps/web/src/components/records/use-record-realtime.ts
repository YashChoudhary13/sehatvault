"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RecordRow = {
  id: string;
  title: string | null;
  type: string;
  ocr_status: string;
  record_date: string | null;
  file_object_key: string | null;
  created_at: string;
  member_id: string;
  summary: string | null;
  summary_hi: string | null;
  facility: string | null;
  doctor: string | null;
};

/**
 * Subscribes to live health_record row changes via Supabase Realtime.
 * Falls back to a 4 s poll if the channel errors or times out.
 * Returns the latest row state.
 */
export function useRecordRealtime(
  recordId: string,
  initial: RecordRow,
): RecordRow {
  const [row, setRow] = useState<RecordRow>(initial);

  useEffect(() => {
    const supabase = createClient();
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    function stopPoll() {
      if (pollInterval !== null) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }

    function startPoll() {
      if (pollInterval !== null) return;
      pollInterval = setInterval(() => {
        void supabase
          .from("health_record")
          .select("*")
          .eq("id", recordId)
          .single()
          .then(({ data }) => {
            if (data) setRow(data as RecordRow);
          });
      }, 4000);
    }

    const channel = supabase
      .channel(`record-${recordId}`)
      .on(
        "postgres_changes" as const,
        {
          event: "UPDATE",
          schema: "public",
          table: "health_record",
          filter: `id=eq.${recordId}`,
        },
        (payload) => {
          setRow(payload.new as RecordRow);
          stopPoll();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          startPoll();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      stopPoll();
    };
  }, [recordId]);

  return row;
}
