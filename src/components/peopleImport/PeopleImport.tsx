"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { ImportKind } from "@/lib/peopleImport/columns";
import type { ReviewState } from "@/lib/peopleImport/reviewState";
import type { Login } from "@/lib/peopleImport/saveBatch";

import ImportUpload from "./ImportUpload";
import LoginList, { loginsToHandOut } from "./LoginList";
import ReviewTable from "./ReviewTable";

/**
 * The people import, from uploading a file to reviewing and saving its rows.
 * New logins are kept in this page's memory only, never stored, so they are
 * gone once the admin leaves.
 */
export default function PeopleImport({ kind }: { kind: ImportKind }) {
  const t = useTranslations("peopleImport");
  const [rows, setRows] = useState<ReviewState["rows"] | null>(null);
  const [logins, setLogins] = useState<Login[]>([]);

  // Warn before leaving while there are logins nobody has received yet.
  const unsent = loginsToHandOut(logins).length > 0;
  useEffect(() => {
    if (!unsent) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsent]);

  if (!rows) return <ImportUpload kind={kind} onReady={setRows} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-gray-700 text-sm">{t("mapping.rowsReady", { count: rows.length })}</p>
        <button
          type="button"
          onClick={() => setRows(null)}
          className="px-3 py-1 border border-gray-300 hover:bg-gray-50 rounded-md text-gray-700 text-sm"
        >
          {t("mapping.changeFile")}
        </button>
      </div>
      <LoginList logins={logins} />
      <ReviewTable kind={kind} initialRows={rows} onLogins={(added) => setLogins((old) => [...old, ...added])} />
    </div>
  );
}
