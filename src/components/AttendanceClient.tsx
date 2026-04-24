"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { saveDailyAttendance } from "@/lib/actions";

const AttendanceClient = ({
  data,
  selectedDate,
  isToday,
  hasAttendance,
}: {
  data: any[];
  selectedDate: string;
  isToday: boolean;
  hasAttendance: boolean;
}) => {
  const router = useRouter();

  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [state, formAction] = useActionState(saveDailyAttendance, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || "Attendance saved");
      router.refresh();
    }

    if (state.error) {
      toast.error(state.message || "Something went wrong");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4 mt-4">
      {/* hidden inputs */}
      <input type="hidden" name="date" value={selectedDate} />
      <input type="hidden" name="scope" value="students" />

      <table className="w-full">
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-3">{item.name}</td>

              <td className="flex items-center gap-2 p-3">
                {isToday ? (
                  <>
                    {/* checkbox */}
                    <input
                      type="checkbox"
                      name={`records.${item.id}`}
                      defaultChecked={item.present}
                      onChange={(e) => {
                        setChanges((prev) => ({
                          ...prev,
                          [item.id]: e.target.checked,
                        }));
                      }}
                    />

                    {/* label */}
                    <span
                      className={`text-xs font-medium ${
                        (changes[item.id] ?? item.present)
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {(changes[item.id] ?? item.present)
                        ? "Present"
                        : "Absent"}
                    </span>
                  </>
                ) : (
                  // no checkbox for past days
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      item.present
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.present ? "Present" : "Absent"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-4">
        {isToday && (
          <button className="bg-academixPurpleDark px-4 py-2 rounded-md w-max text-white">
            Save Attendance
          </button>
        )}
      </div>
    </form>
  );
};

export default AttendanceClient;
