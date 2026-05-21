"use server";

import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

/* =========================
   CREATE NOTIFICATION
========================= */
export async function createNotification({
  recipientId,
  recipientType,
  type,
  title,
  message,
  relatedId,
  schoolId,
}: {
  recipientId: string;
  recipientType: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
  type: NotificationType;
  title: string;
  message?: string;
  relatedId?: number;
  schoolId: number;
}) {
  return prisma.notification.create({
    data: {
      recipientId,
      recipientType,
      type,
      title,
      message,
      relatedId,
      schoolId,
      isRead: false,
    },
  });
}

/* =========================
   GET RECENT (LAST 10)
========================= */
export async function getRecentNotifications(recipientId: string) {
  return prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

/* =========================
   PAGINATION (20 PER PAGE)
========================= */
export async function getNotificationsPage(
  recipientId: string,
  page: number = 1
) {
  const pageSize = 20;

  return prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

/* =========================
   UNREAD COUNT
========================= */
export async function getUnreadCount(recipientId: string) {
  return prisma.notification.count({
    where: {
      recipientId,
      isRead: false,
    },
  });
}

/* =========================
   MARK AS READ
========================= */
export async function markAsRead(id: number) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

/* =========================
   MARK ALL AS READ
========================= */
export async function markAllAsRead(recipientId: string) {
  return prisma.notification.updateMany({
    where: {
      recipientId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}
