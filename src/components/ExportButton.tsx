import { Download } from "lucide-react";
import Link from "next/link";

type ExportButtonProps = {
  href: string;
  title?: string;
};

const ExportButton = ({ href, title = "Export CSV" }: ExportButtonProps) => {
  return (
    <Link
      href={href}
      className="flex justify-center items-center bg-academixPurple hover:bg-academixPurpleDark p-2 rounded-md w-8 h-8 text-academixPurpleDark hover:text-academixPurple transition"
      title={title}
    >
      <Download className="w-4 h-4" />
    </Link>
  );
};

export default ExportButton;
