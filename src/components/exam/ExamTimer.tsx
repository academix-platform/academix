"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface ExamTimerProps {
  submissionId: number;
  initialTimeRemaining: number;
  onSubmit: () => void;
}

export default function ExamTimer({
  submissionId,
  initialTimeRemaining,
  onSubmit,
}: ExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const onSubmitRef = useRef(onSubmit);
  const submittedRef = useRef(false);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    if (timeRemaining <= 0 && !submittedRef.current) {
      submittedRef.current = true;
      onSubmitRef.current();
    }
  }, [timeRemaining]);

  useEffect(() => {
    const tick = () => {
      setTimeRemaining((current) => Math.max(0, current - 1));
    };

    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let currentStream: EventSource | null = null;

    const connect = () => {
      if (!active) return;

      currentStream = new EventSource(`/api/exam-timer/${submissionId}`);

      currentStream.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (typeof data.timeRemaining === "number") {
            setTimeRemaining((current) => {
              // If the server's time is greater (extended) or has drifted significantly, sync it
              if (data.timeRemaining > current || Math.abs(current - data.timeRemaining) > 3) {
                return data.timeRemaining;
              }
              return current;
            });
          }
        } catch (err) {
          console.error("Failed to parse timer data", err);
        }
      };

      currentStream.onerror = () => {
        if (!active) return;

        currentStream?.close();
        if (retryTimeout) clearTimeout(retryTimeout);
        retryTimeout = setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      active = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      currentStream?.close();
    };
  }, [submissionId]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isWarning = timeRemaining <= 300 && timeRemaining > 60;
  const isCritical = timeRemaining <= 60;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors ${
        isCritical
          ? "bg-red-100 text-red-700 animate-pulse"
          : isWarning
          ? "bg-orange-100 text-orange-700"
          : "bg-academixPurpleLight text-academixPurpleDark"
      }`}
    >
      <Clock className="w-5 h-5" />
      <span className="tabular-nums">{formatTime(timeRemaining)}</span>
    </div>
  );
}
