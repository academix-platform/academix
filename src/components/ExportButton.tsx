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
      className="flex justify-center items-center bg-academixPurple hover:bg-academixPurpleDark p-2 rounded-md w-8 h-8 text-academixPurpleDark hover:text-academixPurple transition"
      title={resolvedTitle}
    >
      <Download className="w-4 h-4" />
    </Link>
  );
};

export default ExportButton;
