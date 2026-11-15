"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const EventCalendar = () => {
  const locale = useLocale();
  const [value, onChange] = useState<Value>(new Date());
  const router = useRouter();

  useEffect(() => {
    if (value instanceof Date) {
      router.push(`?date=${value.toLocaleDateString("en-US")}`);
    }
  }, [value, router]);

  return (
    <div className="w-full">
      <Calendar
        onChange={onChange}
        value={value}
        className="react-calendar"
        locale={locale === "ar" ? "ar" : "en-US"}
      />
    </div>
  );
};

export default EventCalendar;
