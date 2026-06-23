"use client";

import { MemberForm } from "@/components/member-form";
import { createMember } from "@/app/actions/member";
import { useT } from "@/components/locale-provider";

export default function NewMemberPage() {
  const translate = useT();
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold text-primary-ink">
        {translate("members.form.title")}
      </h1>
      <MemberForm onSubmit={createMember} cancelHref="/" />
    </main>
  );
}
