import { Upload } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

/** The "Import" button on the students and teachers lists, styled like the export button next to it. */
const ImportLink = async ({ href }: { href: "/list/students/import" | "/list/teachers/import" }) => {
  const t = await getTranslations("peopleImport");

  return (
    <Link
      href={href}
      className="inline-flex justify-center items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs px-3 h-9 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
    >
      <Upload className="w-4 h-4" aria-hidden="true" />
      {t("importButton")}
    </Link>
  );
};

export default ImportLink;
