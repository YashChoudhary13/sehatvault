import { describe, it, expect } from "vitest";
import { summarizeDashboard } from "./dashboard";

const now = new Date("2026-06-26T12:00:00Z");

describe("summarizeDashboard", () => {
  it("counts members and records", () => {
    const s = summarizeDashboard(
      [{ id: "a" }, { id: "b" }],
      [{ id: "r1", created_at: "2026-06-25T00:00:00Z" }],
      now,
    );
    expect(s.memberCount).toBe(2);
    expect(s.recordCount).toBe(1);
  });

  it("counts only records from the last 7 days as recent", () => {
    const s = summarizeDashboard(
      [],
      [
        { id: "r1", created_at: "2026-06-24T00:00:00Z" }, // 2 days ago -> recent
        { id: "r2", created_at: "2026-06-10T00:00:00Z" }, // 16 days ago -> not
      ],
      now,
    );
    expect(s.recentCount).toBe(1);
  });

  it("handles empty inputs", () => {
    expect(summarizeDashboard([], [], now)).toEqual({ memberCount: 0, recordCount: 0, recentCount: 0 });
  });
});
