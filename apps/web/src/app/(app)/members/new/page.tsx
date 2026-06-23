"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";
import { createMember } from "@/app/actions/member";
import type { InsertMemberData } from "@sehatvault/core";

// Local form schema: allergies/conditions are comma-separated strings in the UI,
// transformed to string[] before being passed to the Server Action.
const FormSchema = z.object({
  name: z.string().min(1, "members.form.error.name_required"),
  relationship: z.string().min(1, "members.form.error.relationship_required"),
  dob: z.string().min(1, "members.form.error.dob_required"),
  sex: z.enum(["male", "female", "other", "unknown"]),
  blood_group: z.string().optional(),
  allergies: z.string().optional(),
  conditions: z.string().optional(),
  emergency_contact: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

function splitList(raw?: string): string[] {
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

const SEX_OPTIONS = ["male", "female", "other", "unknown"] as const;

export default function NewMemberPage() {
  const translate = useT();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      relationship: "",
      dob: "",
      blood_group: "",
      allergies: "",
      conditions: "",
      emergency_contact: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const payload: InsertMemberData = {
      name: values.name,
      relationship: values.relationship,
      dob: values.dob,
      sex: values.sex,
      blood_group: values.blood_group,
      allergies: splitList(values.allergies),
      conditions: splitList(values.conditions),
      emergency_contact: values.emergency_contact,
    };
    const result = await createMember(payload);
    if (result?.error) setServerError(translate(result.error));
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold text-primary-ink">
        {translate("members.form.title")}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* ── Basic info ──────────────────────────────────────────── */}
          <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{translate("members.form.name.label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={translate("members.form.name.placeholder")}
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  {fieldState.error && (
                    <p className="text-sm text-danger">
                      {translate(fieldState.error.message ?? "")}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationship"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    {translate("members.form.relationship.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={translate(
                        "members.form.relationship.placeholder",
                      )}
                      {...field}
                    />
                  </FormControl>
                  {fieldState.error && (
                    <p className="text-sm text-danger">
                      {translate(fieldState.error.message ?? "")}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dob"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{translate("members.form.dob.label")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    {fieldState.error && (
                      <p className="text-sm text-danger">
                        {translate(fieldState.error.message ?? "")}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translate("members.form.sex.label")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEX_OPTIONS.map((v) => (
                          <SelectItem key={v} value={v}>
                            {translate(`members.form.sex.${v}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* ── Medical info ────────────────────────────────────────── */}
          <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
            <FormField
              control={form.control}
              name="blood_group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {translate("members.form.blood_group.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={translate(
                        "members.form.blood_group.placeholder",
                      )}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {translate("members.form.allergies.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={translate(
                        "members.form.allergies.placeholder",
                      )}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {translate("members.form.conditions.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={translate(
                        "members.form.conditions.placeholder",
                      )}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          {/* ── Emergency contact ───────────────────────────────────── */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <FormField
              control={form.control}
              name="emergency_contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {translate("members.form.emergency_contact.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={translate(
                        "members.form.emergency_contact.placeholder",
                      )}
                      inputMode="tel"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          {serverError && (
            <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 pb-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/">{translate("members.form.cancel")}</Link>
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting
                ? translate("members.form.saving")
                : translate("members.form.save")}
            </Button>
          </div>
        </form>
      </Form>
    </main>
  );
}
