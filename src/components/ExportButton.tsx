import { Download } from "lucide-react";
import Link from "next/link";

type ExportButtonProps = {
  href: string;
  title?: string;
};

const ExportButton = ({
  href,
  title = "Export CSV",
}: ExportButtonProps) => {
  return (
    <Link
      href={href}
      className="flex justify-center items-center bg-academixYellow rounded-full w-8 h-8"
      title={title}
    >
      <Download className="w-4 h-4" />
    </Link>
  );
};

export default ExportButton;