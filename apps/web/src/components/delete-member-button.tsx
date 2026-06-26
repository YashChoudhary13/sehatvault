"use client";

import { useTransition } from "react";
import { useT } from "@/components/locale-provider";
import { deleteMember } from "@/app/actions/member";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteMemberButton({ memberId }: { memberId: string }) {
  const translate = useT();
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await deleteMember(memberId);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger" disabled={isPending}>
          {translate("members.profile.delete")}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {translate("members.profile.confirm_delete.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {translate("members.profile.confirm_delete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {translate("members.profile.confirm_delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger"
          >
            {translate("members.profile.confirm_delete.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
