// src/app/api/notifications/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─── GET: جلب إشعارات المستخدم ───────────────────────────────────────────────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ─── PATCH: تحديد إشعار كـ مقروء ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data:  { isRead: true },
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id: Number(id) },
        data:  { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ─── DELETE: حذف إشعار أو كل الإشعارات ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, deleteAll } = body;

    if (deleteAll) {
      // حذف كل إشعارات المستخدم
      await prisma.notification.deleteMany({
        where: { userId },
      });
    } else if (id) {
      // حذف إشعار واحد — التأكد أنه يخص المستخدم
      await prisma.notification.deleteMany({
        where: { id: Number(id), userId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/notifications]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}