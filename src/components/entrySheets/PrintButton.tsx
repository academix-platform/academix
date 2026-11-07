"use client";

import { Printer } from "lucide-react";

const PrintButton = ({ label }: { label: string }) => (
  <button
    type="button"
    onClick={() => window.print()}
    className="inline-flex items-center gap-2 bg-academixPurpleDark px-4 py-2 rounded-md text-white text-sm"
  >
    <Printer className="w-4 h-4" aria-hidden />
    {label}
  </button>
);

export default PrintButton;
