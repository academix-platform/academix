import { getNotificationsPage, markAllAsRead } from "@/lib/actions/notification";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const { userId } = auth();

  if (!userId) redirect("/sign-in");

  const page = Number(searchParams.page || "1");

  const notifications = await getNotificationsPage(userId, page);

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Notifications</h1>

        <form
          action={async () => {
            "use server";
            await markAllAsRead(userId);
            revalidatePath("/list/notifications");
          }}
        >
          <button className="text-sm px-3 py-1 bg-black text-white rounded-md hover:bg-gray-800 transition">
            Mark all as read
          </button>
        </form>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No notifications</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={p-3 border rounded-md flex flex-col gap-1 ${
                n.isRead ? "opacity-50" : "bg-blue-50 border-blue-100"
              }}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm">{n.title}</h3>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                  {n.type}
                </span>
              </div>

              {n.message && <p className="text-xs text-gray-600">{n.message}</p>}
            </div>
          ))
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex gap-2 mt-6 justify-center sm:justify-start">
        <a
          href={?page=${page - 1}}
          className={text-sm px-3 py-1 border rounded ${
            page <= 1 ? "pointer-events-none opacity-40 bg-gray-100" : "hover:bg-gray-50"
          }}
        >
          Prev
        </a>

        <span className="text-sm px-3 py-1 border rounded bg-gray-50">Page {page}</span>

        <a
          href={?page=${page + 1}}
          className={text-sm px-3 py-1 border rounded hover:bg-gray-50 ${
            notifications.length < 20 ? "pointer-events-none opacity-40 bg-gray-100" : ""
          }}
        >
          Next
        </a>
      </div>
    </div>
  );
}
