import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  InsertRecordSchema,
  type InsertRecordData,
  RECORD_TYPES,
} from "./record";

const {
  mockCreateClient,
  mockRedirect,
  mockRevalidatePath,
  mockRandomUUID,
  redirectSignal,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRedirect: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRandomUUID: vi.fn(),
  redirectSignal: new Error("NEXT_REDIRECT"),
}));

const validRecord = {
  member_id: "550e8400-e29b-41d4-a716-446655440000",
  type: "lab_report",
  record_date: "2026-06-26",
  title: "HbA1c blood test",
  facility: "City Diagnostics",
  doctor: "Dr. Mehta",
  summary: "Routine diabetes monitoring",
} satisfies InsertRecordData;

type SchemaParser<T> = {
  parse: (input: unknown) => T;
};

const TEST_MAX_BYTES = 52_428_800;
const TEST_SIGNED_URL_TTL_SECONDS = 60;

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});

const ingestAcceptedSchema = z.object({
  id: z.string().uuid(),
});

const recordFileResponseSchema = z.object({
  url: z.string().url(),
  expires_at: z.string().datetime(),
});

type IngestRouteModule = {
  POST: (request: Request) => Promise<Response>;
};

type RecordFileRouteModule = {
  GET: (
    request: Request,
    context: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
};

type RecordActionsModule = {
  __setRecordActionRuntimeForTests: (overrides: {
    revalidatePath?: (path: string) => void;
    redirect?: (path: string) => never;
  }) => Promise<void>;
  createRecord: (data: InsertRecordData) => Promise<unknown>;
  deleteRecord: (id: string) => Promise<unknown>;
};

type RecordEditActionsModule = {
  updateRecord: (id: string, data: InsertRecordData) => Promise<unknown>;
};

function createSupabaseMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    rpc: vi.fn(),
    ...overrides,
  };
}

function createTableRouter(tables: Record<string, unknown>) {
  return vi.fn((table: string) => {
    const impl = tables[table];
    if (!impl) {
      throw new Error(`Unexpected table access: ${table}`);
    }
    return impl;
  });
}

function importRuntimeModule<T>(path: string): Promise<T> {
  return import(/* @vite-ignore */ path) as Promise<T>;
}

function applyModuleMocks() {
  vi.doMock("../../../apps/web/src/lib/supabase/server", () => ({
    createClient: mockCreateClient,
  }));
  vi.doMock("next/navigation", () => ({
    redirect: mockRedirect,
  }));
  vi.doMock("next/cache", () => ({
    revalidatePath: mockRevalidatePath,
  }));
  vi.doMock("crypto", async (importOriginal) => {
    const actual = await importOriginal<typeof import("crypto")>();

    return {
      ...actual,
      randomUUID: mockRandomUUID,
    };
  });
}

async function loadIngestRoute() {
  vi.resetModules();
  applyModuleMocks();
  return importRuntimeModule<IngestRouteModule>(
    "../../../apps/web/src/app/api/ingest/route",
  );
}

async function loadRecordFileRoute() {
  vi.resetModules();
  applyModuleMocks();
  return importRuntimeModule<RecordFileRouteModule>(
    "../../../apps/web/src/app/api/records/[id]/file/route",
  );
}

async function loadRecordActions() {
  vi.resetModules();
  applyModuleMocks();
  return importRuntimeModule<RecordActionsModule>(
    "../../../apps/web/src/app/actions/record",
  );
}

async function loadRecordEditActions() {
  vi.resetModules();
  applyModuleMocks();
  return importRuntimeModule<RecordEditActionsModule>(
    "../../../apps/web/src/app/actions/record-edit",
  );
}

async function loadRecordActionSuite() {
  vi.resetModules();
  applyModuleMocks();

  const recordModule = await importRuntimeModule<RecordActionsModule>(
    "../../../apps/web/src/app/actions/record",
  );
  const recordEditModule = await importRuntimeModule<RecordEditActionsModule>(
    "../../../apps/web/src/app/actions/record-edit",
  );

  return {
    ...recordModule,
    ...recordEditModule,
  };
}

describe("InsertRecordSchema", () => {
  it("accepts a fully populated valid record", () => {
    const result = InsertRecordSchema.safeParse(validRecord);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual(validRecord);
  });

  it("accepts every record type", () => {
    for (const type of RECORD_TYPES) {
      const result = InsertRecordSchema.safeParse({
        ...validRecord,
        type,
      });

      expect(result.success).toBe(true);
    }
  });

  it("rejects missing or invalid member_id", () => {
    const missingMemberId = InsertRecordSchema.safeParse({
      type: validRecord.type,
    });
    const invalidMemberId = InsertRecordSchema.safeParse({
      ...validRecord,
      member_id: "not-a-uuid",
    });

    expect(missingMemberId.success).toBe(false);
    expect(invalidMemberId.success).toBe(false);
  });

  it("rejects missing type or an invalid type value", () => {
    const missingType = InsertRecordSchema.safeParse({
      member_id: validRecord.member_id,
    });
    const invalidType = InsertRecordSchema.safeParse({
      ...validRecord,
      type: "xray",
    });

    expect(missingType.success).toBe(false);
    expect(invalidType.success).toBe(false);
  });

  it("rejects impossible record_date values", () => {
    for (const record_date of ["not-a-date", "2026-13-01", "20260101", "2026-02-31"]) {
      const result = InsertRecordSchema.safeParse({
        ...validRecord,
        record_date,
      });

      expect(result.success).toBe(false);
    }
  });

  it("accepts omitted nullable form fields", () => {
    const result = InsertRecordSchema.safeParse({
      member_id: validRecord.member_id,
      type: validRecord.type,
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual({
      member_id: validRecord.member_id,
      type: validRecord.type,
    });
  });

  it("trims strings and normalizes blank optional values away", () => {
    const result = InsertRecordSchema.safeParse({
      ...validRecord,
      record_date: " 2026-06-26 ",
      title: "  Follow-up lab  ",
      facility: "   ",
      doctor: "\nDr. Rao\t",
      summary: "   ",
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual({
      member_id: validRecord.member_id,
      type: validRecord.type,
      record_date: "2026-06-26",
      title: "Follow-up lab",
      doctor: "Dr. Rao",
    });
  });

  it("rejects values longer than the form allows", () => {
    const result = InsertRecordSchema.safeParse({
      ...validRecord,
      title: "a".repeat(256),
      facility: "b".repeat(256),
      doctor: "c".repeat(256),
      summary: "d".repeat(2001),
    });

    expect(result.success).toBe(false);
  });

  it("infers InsertRecordData from a valid parse result", () => {
    const result = InsertRecordSchema.safeParse(validRecord);

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error("Expected record parse to succeed");
    }

    const typedRecord: InsertRecordData = result.data;

    expect(typedRecord).toEqual(validRecord);
  });
});

describe("record API contracts", () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockRedirect.mockReset();
    mockRevalidatePath.mockReset();
    mockRandomUUID.mockReset();
    mockRedirect.mockImplementation(() => {
      throw redirectSignal;
    });
    mockRandomUUID.mockReturnValue("fixed-uuid");
    vi.useRealTimers();
  });

  it("returns a 401 JSON contract for unauthenticated ingest", async () => {
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { POST } = await loadIngestRoute();
    const response = await POST(new Request("http://localhost/api/ingest", { method: "POST" }) as never);

    expect(response.status).toBe(401);
    expect(apiErrorSchema.parse(await response.json())).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
        details: null,
      },
    });
  });

  it("rejects unsupported ingest MIME types before any storage write", async () => {
    const familySingle = vi.fn().mockResolvedValue({ data: { id: "family-1" } });
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: createTableRouter({
        family: {
          select: vi.fn().mockReturnValue({
            single: familySingle,
          }),
        },
      }),
      storage: {
        from: vi.fn(),
      },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const formData = new FormData();
    formData.set("file", new File(["plain"], "note.txt", { type: "text/plain" }));
    formData.set("member_id", validRecord.member_id);

    const { POST } = await loadIngestRoute();
    const response = await POST(
      new Request("http://localhost/api/ingest", { method: "POST", body: formData }) as never,
    );

    expect(response.status).toBe(415);
    expect(apiErrorSchema.parse(await response.json())).toEqual({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Unsupported file type",
        details: null,
      },
    });
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it("rejects ingest payloads larger than 50 MiB", async () => {
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: createTableRouter({
        family: {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "family-1" } }),
          }),
        },
      }),
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { POST } = await loadIngestRoute();
    const oversized = new File([new Uint8Array(TEST_MAX_BYTES + 1)], "scan.pdf", {
      type: "application/pdf",
    });

    const formData = new FormData();
    formData.set("file", oversized);
    formData.set("member_id", validRecord.member_id);

    const response = await POST(
      new Request("http://localhost/api/ingest", { method: "POST", body: formData }) as never,
    );

    expect(response.status).toBe(413);
    expect(apiErrorSchema.parse(await response.json())).toEqual({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "File too large (max 50 MB)",
        details: null,
      },
    });
  });

  it("accepts ingest, inserts a pending upload record, and enqueues best-effort processing", async () => {
    const familyId = "11111111-1111-4111-8111-111111111111";
    const userId = "22222222-2222-4222-8222-222222222222";
    const recordId = "33333333-3333-4333-8333-333333333333";
    const upload = vi.fn().mockResolvedValue({ error: null });
    const healthRecordInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: recordId }, error: null }),
      }),
    });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: createTableRouter({
        family: {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: familyId } }),
          }),
        },
        member_profile: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: validRecord.member_id } }),
            }),
          }),
        },
        health_record: {
          insert: healthRecordInsert,
        },
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload,
          remove: vi.fn(),
        }),
      },
      rpc,
    });
    mockCreateClient.mockResolvedValue(supabase);

    const formData = new FormData();
    formData.set("file", new File(["pdf-body"], "my report.pdf", { type: "application/pdf" }));
    formData.set("member_id", validRecord.member_id);

    const { POST } = await loadIngestRoute();
    const response = await POST(
      new Request("http://localhost/api/ingest", { method: "POST", body: formData }) as never,
    );
    const body = ingestAcceptedSchema.parse(await response.json());

    expect(response.status).toBe(202);
    expect(body).toEqual({ id: recordId });
    expect(upload).toHaveBeenCalledWith(
      `${familyId}/fixed-uuid-my_report.pdf`,
      expect.any(ArrayBuffer),
      { contentType: "application/pdf", upsert: false },
    );
    expect(healthRecordInsert).toHaveBeenCalledWith([
      {
        family_id: familyId,
        member_id: validRecord.member_id,
        file_object_key: `${familyId}/fixed-uuid-my_report.pdf`,
        source: "upload",
        ocr_status: "pending",
        created_by: userId,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("pgmq_send", {
      p_queue_name: "ai_jobs",
      p_message: JSON.stringify({ record_id: recordId }),
    });
  });

  it("returns a 403 JSON contract for unauthenticated file access", async () => {
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { GET } = await loadRecordFileRoute();
    const response = await GET(new Request("http://localhost/api/records/x/file") as never, {
      params: Promise.resolve({ id: "x" }),
    });

    expect(response.status).toBe(403);
    expect(apiErrorSchema.parse(await response.json())).toEqual({
      error: {
        code: "unauthenticated",
        message: "Authentication required",
        details: null,
      },
    });
  });

  it("returns the same 403 contract for cross-family or invisible records", async () => {
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: createTableRouter({
        health_record: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        },
      }),
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { GET } = await loadRecordFileRoute();
    const response = await GET(new Request("http://localhost/api/records/x/file") as never, {
      params: Promise.resolve({ id: "x" }),
    });

    expect(response.status).toBe(403);
    expect(apiErrorSchema.parse(await response.json())).toEqual({
      error: {
        code: "forbidden",
        message: "Document unavailable",
        details: null,
      },
    });
  });

  it("returns a <=60s signed URL contract for an authorized record file", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00.000Z"));

    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/signed-file.pdf" },
      error: null,
    });
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: createTableRouter({
        health_record: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "record-1",
                  file_object_key: "family-1/member-1/record-1/file.pdf",
                },
              }),
            }),
          }),
        },
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl,
        }),
      },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { GET } = await loadRecordFileRoute();
    const response = await GET(new Request("http://localhost/api/records/record-1/file") as never, {
      params: Promise.resolve({ id: "record-1" }),
    });
    const body = recordFileResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://example.com/signed-file.pdf");
    expect(body.expires_at).toBe("2026-06-26T12:01:00.000Z");
    expect(createSignedUrl).toHaveBeenCalledWith(
      "family-1/member-1/record-1/file.pdf",
      TEST_SIGNED_URL_TTL_SECONDS,
    );
  });
});

describe("record server actions", () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockRedirect.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockImplementation(() => {
      throw redirectSignal;
    });
  });

  it("creates a manual record with server-resolved family_id and nullable fields", async () => {
    const userId = "22222222-2222-4222-8222-222222222222";
    const familyId = "11111111-1111-4111-8111-111111111111";
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: createTableRouter({
        family: {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: familyId } }),
          }),
        },
        health_record: {
          insert,
        },
      }),
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { __setRecordActionRuntimeForTests, createRecord } =
      await loadRecordActionSuite();
    await __setRecordActionRuntimeForTests({
      revalidatePath: mockRevalidatePath,
      redirect: ((url: string) => {
        mockRedirect(url);
        throw redirectSignal;
      }) as (path: string) => never,
    });

    await expect(
      createRecord({
        member_id: validRecord.member_id,
        type: "other",
        title: "   ",
        record_date: undefined,
        facility: undefined,
        doctor: undefined,
        summary: undefined,
      }),
    ).rejects.toBe(redirectSignal);

    expect(insert).toHaveBeenCalledWith({
      family_id: familyId,
      member_id: validRecord.member_id,
      type: "other",
      source: "manual",
      ocr_status: "manual",
      record_date: null,
      title: null,
      facility: null,
      doctor: null,
      summary: null,
      created_by: userId,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/records");
    expect(mockRedirect).toHaveBeenCalledWith("/records");
  });

  it("updates every editable record field and preserves nullable values as null", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: createTableRouter({
        health_record: {
          update,
        },
      }),
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { __setRecordActionRuntimeForTests, updateRecord } =
      await loadRecordActionSuite();
    await __setRecordActionRuntimeForTests({
      revalidatePath: mockRevalidatePath,
      redirect: ((url: string) => {
        mockRedirect(url);
        throw redirectSignal;
      }) as (path: string) => never,
    });

    await expect(
      updateRecord("record-1", {
        member_id: validRecord.member_id,
        type: "scan",
        record_date: undefined,
        title: "  MRI Follow-up  ",
        facility: "  City Imaging  ",
        doctor: "",
        summary: "   ",
      }),
    ).rejects.toBe(redirectSignal);

    expect(update).toHaveBeenCalledWith({
      member_id: validRecord.member_id,
      type: "scan",
      record_date: null,
      title: "MRI Follow-up",
      facility: "City Imaging",
      doctor: null,
      summary: null,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/records");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/records/record-1");
    expect(mockRedirect).toHaveBeenCalledWith("/records/record-1");
  });

  it("deletes the record even when storage removal returns an error payload", async () => {
    const remove = vi.fn().mockResolvedValue({ error: { message: "storage failed" } });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const supabase = createSupabaseMock({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: createTableRouter({
        health_record: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "record-1",
                  file_object_key: "family-1/member-1/record-1/file.pdf",
                },
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: deleteEq,
          }),
        },
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          remove,
        }),
      },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { __setRecordActionRuntimeForTests, deleteRecord } =
      await loadRecordActionSuite();
    await __setRecordActionRuntimeForTests({
      revalidatePath: mockRevalidatePath,
      redirect: ((url: string) => {
        mockRedirect(url);
        throw redirectSignal;
      }) as (path: string) => never,
    });
    const result = await deleteRecord("record-1");

    expect(result).toEqual({ success: true });
    expect(remove).toHaveBeenCalledWith(["family-1/member-1/record-1/file.pdf"]);
    expect(deleteEq).toHaveBeenCalledWith("id", "record-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/records");
  });
});
