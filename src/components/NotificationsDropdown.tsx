"use client";

import { useEffect, useState } from "react";
import {
  getRecentNotifications,
  markAsRead,
} from "@/lib/actions/notification";

import type { Notification } from "@prisma/client";

export default function NotificationsDropdown({
  recipientId, 
}: {
  recipientId: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getRecentNotifications(recipientId);
        setNotifications(data);
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        setLoading(false);
      }
    }

    if (recipientId) load();
  }, [recipientId]);

  if (loading) {
    return <p className="text-sm text-gray-500 p-4">Loading...</p>;
  }

  return (
    <div className="bg-white shadow-lg rounded-md p-4 w-80 border border-gray-200">
      <h2 className="font-bold mb-2 text-lg text-gray-800">
        Notifications
      </h2>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          No new notifications
        </p>
      ) : (
        <ul className="max-h-60 overflow-y-auto">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={p-2 border-b last:border-0 flex flex-col gap-1 ${
                n.isRead ? "opacity-50" : "bg-blue-50/50 font-semibold"
              }}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm text-gray-900">{n.title}</p>

                {!n.isRead && (
                  <button
                    onClick={async () => {
                      try {
                        await markAsRead(n.id);

                        setNotifications((prev) =>
                          prev.map((item) =>
                            item.id === n.id
                              ? { ...item, isRead: true }
                              : item
                          )
                        );
                      } catch (err) {
                        console.error("Failed to mark as read", err);
                      }
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>

              {n.message && (
                <p className="text-xs text-gray-600">{n.message}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
