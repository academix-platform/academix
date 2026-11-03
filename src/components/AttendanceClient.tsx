"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
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
  const handledResultRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(saveDailyAttendance, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (isPending) {
      handledResultRef.current = null;
      return;
    }

    const resultKey = `${state.success}:${state.error}:${state.message}`;
    if (handledResultRef.current === resultKey) {
      return;
    }

    handledResultRef.current = resultKey;

    if (state.success) {
      toast.success(state.message || t("saved"));
      router.refresh();
    } else if (state.error) {
      toast.error(state.message || actionsT("somethingWentWrong"));
    }
  }, [
    state.success,
    state.error,
    state.message,
    isPending,
    router,
    t,
    actionsT,
  ]);

  if (data.length === 0) {
    return (
      <EmptyState
        title={
          hasAttendance
            ? t("noRecordsPage")
            : t("noScopeFound", { scope: filtersT(scope) })
        }
        description={hasAttendance ? t("tryAnotherPage") : t("noRecordsDate")}
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
        <button
          type="submit"
          disabled={isPending}
          className="bg-academixPurpleDark disabled:opacity-70 px-2 py-2 rounded-md w-max text-white disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? actionsT("saving") : t("save")}
          </span>
        </button>
      )}
    </form>
  );
};

export default AttendanceClient;
