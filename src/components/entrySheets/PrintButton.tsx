"use client";

import { FileDown, Printer } from "lucide-react";

/** Characters Windows and macOS don't allow in file names. */
const UNSAFE_FILE_NAME = /[\\/:*?"<>|]+/g;

/**
 * Opens the browser's print dialog. The page title becomes the file name
 * the dialog suggests when saving as PDF, so it is set to `fileName` until
 * printing ends.
 */
const PrintButton = ({
  label,
  fileName,
  kind = "print",
}: {
  label: string;
  fileName: string;
  kind?: "print" | "pdf";
}) => {
  const Icon = kind === "pdf" ? FileDown : Printer;

  return (
    <button
      type="button"
      onClick={() => {
        const previousTitle = document.title;
        document.title = fileName.replace(UNSAFE_FILE_NAME, "-");
        window.addEventListener("afterprint", () => (document.title = previousTitle), { once: true });
        window.print();
      }}
      className={
        kind === "pdf"
          ? "inline-flex items-center gap-2 hover:bg-gray-50 px-4 py-2 border border-academixPurpleDark rounded-md text-academixPurpleDark text-sm"
          : "inline-flex items-center gap-2 bg-academixPurpleDark px-4 py-2 rounded-md text-white text-sm"
      }
    >
      <Icon className="w-4 h-4" aria-hidden />
      {label}
    </button>
  );
};

export default PrintButton;
