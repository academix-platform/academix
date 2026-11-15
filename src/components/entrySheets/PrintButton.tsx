"use client";

import { Printer } from "lucide-react";

/** Characters Windows and macOS don't allow in file names. */
const UNSAFE_FILE_NAME = /[\\/:*?"<>|]+/g;

/**
 * Opens the browser's print dialog. The page title becomes the file name
 * the dialog suggests when saving as PDF, so it is set to `fileName` until
 * printing ends.
 */
const PrintButton = ({ label, fileName }: { label: string; fileName: string }) => {
  return (
    <button
      type="button"
      onClick={() => {
        const previousTitle = document.title;
        document.title = fileName.replace(UNSAFE_FILE_NAME, "-");
        window.addEventListener("afterprint", () => (document.title = previousTitle), { once: true });
        window.print();
      }}
      className="inline-flex items-center gap-2 bg-academixPurpleDark px-4 py-2 rounded-md text-white text-sm"
    >
      <Printer className="w-4 h-4" aria-hidden />
      {label}
    </button>
  );
};

export default PrintButton;
