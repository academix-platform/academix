"use client";

import { useEffect, useState } from "react";
import { getNotifications, markAsRead } from "@/src/lib/actions/notification";

export default function NotificationsDropdown({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getNotifications(userId);
        setNotifications(data);
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        setLoading(false);
      }
    }
    if (userId) load();
  }, [userId]);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="bg-white shadow-lg rounded-md p-4 w-80 border border-gray-200">
      <h2 className="font-bold mb-2 text-lg text-gray-800">Notifications</h2>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No new notifications</p>
      ) : (
        <ul className="max-h-60 overflow-y-auto">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`p-2 border-b last:border-0 flex flex-col gap-1 ${
                n.isRead ? "opacity-50" : "bg-blue-50/50 font-semibold"
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm text-gray-900">{n.title}</p>
                {!n.isRead && (
                  <button
                    onClick={async () => {
                      await markAsRead(n.id);
                      setNotifications((prev) =>
                        prev.map((item) =>
                          item.id === n.id ? { ...item, isRead: true } : item
                        )
                      );
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600">{n.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}