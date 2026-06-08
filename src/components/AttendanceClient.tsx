"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { saveDailyAttendance } from "@/lib/actions";
import EmptyState from "@/components/states/EmptyState";
import { useTranslations } from "next-intl";

const AttendanceClient = ({
  data,
  selectedDate,
  isToday,
  hasAttendance,
  scope,
}: {
  data: any[];
  selectedDate: string;
  isToday: boolean;
  hasAttendance: boolean;
  scope: "students" | "teachers";
}) => {
  const t = useTranslations("attendance");
  const filtersT = useTranslations("filters");
  const actionsT = useTranslations("actions");
  const router = useRouter();

  const [changes, setChanges] = useState<Record<string, boolean>>({});

  const [state, formAction] = useActionState(saveDailyAttendance, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || t("saved"));
      router.refresh();
    }

    if (state.error) {
      toast.error(state.message || actionsT("somethingWentWrong"));
    }
  }, [state, router, t, actionsT]);

  if (data.length === 0) {
    return (
      <EmptyState
        title={
          hasAttendance
            ? t("noRecordsPage")
            : t("noScopeFound", { scope: filtersT(scope) })
        }
        description={
          hasAttendance
            ? t("tryAnotherPage")
            : t("noRecordsDate")
        }
      />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 mt-4">
      <input type="hidden" name="date" value={selectedDate} />
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="changes" value={JSON.stringify(changes)} />
      <table className="w-full">
        <tbody>
          {data.map((item) => {
            const checked = changes[item.id] ?? item.present;

            return (
              <tr key={item.id} className="border-b">
                <td className="p-3">{item.name}</td>

                <td className="flex items-center gap-2 p-3">
                  {isToday ? (
                    <>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setChanges((prev) => ({
                            ...prev,
                            [item.id]: e.target.checked,
                          }));
                        }}
                      />

                      <span
                        className={`text-xs font-medium ${
                          checked ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {checked ? t("present") : t("absent")}
                      </span>
                    </>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.present
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.present ? t("present") : t("absent")}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isToday && (
        <button className="bg-academixPurpleDark px-2 py-2 rounded-md w-max text-white">
          {t("save")}
        </button>
      )}
    </form>
  );
};

export default AttendanceClient;
