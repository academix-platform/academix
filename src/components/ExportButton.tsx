import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type ExportButtonProps = {
  href: string;
  title?: string;
};

const ExportButton = async ({ href, title }: ExportButtonProps) => {
  const t = await getTranslations("actions");
  const resolvedTitle = title ?? t("exportCsv");

  return (
    <Link
      href={href}
      className="inline-flex justify-center items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs p-2 w-9 h-9 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
      title={resolvedTitle}
      aria-label={resolvedTitle}
    >
      <Download className="w-4 h-4" />
    </Link>
  );
};

export default ExportButton;
