"use server";

import  prisma  from "@/lib/prisma"; 

// 1. Create Notification
export async function createNotification(
  userId: string,
  title: string,
  message: string
) {
  if (!userId || !title || !message) {
    throw new Error("Missing fields");
  }

  return await prisma.notification.create({
    data: {
      userId,
      title,
      message,
    },
  });
}

// 2. Get Notifications
export async function getNotifications(userId: string) {
  if (!userId) return [];
  
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// 3. Mark as Read
export async function markAsRead(id: string) {
  return await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}