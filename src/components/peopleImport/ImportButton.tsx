"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ImportKind } from "@/lib/peopleImport/columns";

import PeopleImport from "./PeopleImport";

/**
 * The "Import" button on the students and teachers lists. It opens the import
 * in a dialog over the list instead of moving to another page.
 */
export default function ImportButton({ kind }: { kind: ImportKind }) {
  const t = useTranslations("peopleImport");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // True once a file is loaded or there are logins nobody has received yet.
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const close = () => {
    setConfirmOpen(false);
    setOpen(false);
    setDirty(false);
    // Show any people the import just saved.
    router.refresh();
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    if (dirty) setConfirmOpen(true);
    else close();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="inline-flex justify-center items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs px-3 h-9 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
      >
        <Upload className="w-4 h-4" aria-hidden="true" />
        {t("importButton")}
      </button>
      <DialogContent size="2xl" aria-labelledby="people-import-title">
        <DialogHeader className="pe-12">
          <DialogTitle id="people-import-title">
            {kind === "students" ? t("studentsTitle") : t("teachersTitle")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <PeopleImport kind={kind} onDirtyChange={setDirty} />
        </DialogBody>
      </DialogContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("closeConfirm.title")}
        description={t("closeConfirm.description")}
        confirmLabel={t("closeConfirm.confirm")}
        cancelLabel={t("closeConfirm.cancel")}
        variant="primary"
        onConfirm={close}
      />
    </Dialog>
  );
}
