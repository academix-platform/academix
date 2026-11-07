import type { PrintableSheet } from "@/lib/entrySheets/printSheet";

export type SheetLabels = {
  className: string;
  outOf: string;
  pageOf: (page: number, total: number) => string;
  student: string;
  box: string;
};

/**
 * One A4 page per sheet page. Sizes are in millimetres so the printout
 * matches the layout tested with scripts/sheet-test/sample-sheets.html:
 * 30 rows of 8 mm fit with room to write.
 */
const SheetLayout = ({ sheet, labels }: { sheet: PrintableSheet; labels: SheetLabels }) => {
  const total = sheet.pages.length;

  return (
    <div className="flex flex-col items-center gap-6 print:gap-0">
      {sheet.pages.map((rows, index) => {
        const pageLabel = labels.pageOf(index + 1, total);
        return (
          <section
            key={index}
            aria-label={pageLabel}
            className="entry-sheet-page bg-white shadow-sm print:shadow-none px-[14mm] py-[10mm] w-[210mm] h-[297mm] text-black"
          >
            <header className="flex justify-between gap-[8mm] h-[20mm] text-[12pt] leading-normal">
              <div>
                <div>{sheet.schoolName}</div>
                <div>
                  {labels.className}: {sheet.className} — {sheet.title} — {labels.outOf}
                </div>
              </div>
              <div className="font-bold text-end">
                <div dir="ltr" className="text-[15pt] tracking-wider">
                  {sheet.code}
                </div>
                <div>{pageLabel}</div>
              </div>
            </header>

            <table className="w-full border-collapse text-[11pt]">
              <thead>
                <tr>
                  <th scope="col" className="bg-gray-100 px-[3mm] border-[0.3mm] border-black w-[12mm] h-[8mm]">
                    #
                  </th>
                  <th scope="col" className="bg-gray-100 px-[3mm] border-[0.3mm] border-black h-[8mm]">
                    {labels.student}
                  </th>
                  <th scope="col" className="bg-gray-100 px-[3mm] border-[0.3mm] border-black w-[36mm] h-[8mm]">
                    {labels.box}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-[3mm] border-[0.3mm] border-black h-[8mm] text-center">
                      {row.rowNumber}
                    </td>
                    <td className="px-[3mm] border-[0.3mm] border-black h-[8mm]">{row.name}</td>
                    <td className="px-[3mm] border-[0.3mm] border-black h-[8mm]" />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
};

export default SheetLayout;
