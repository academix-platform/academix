import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getExamEndsAt, getTimeRemainingSeconds } from "@/lib/exams/timing";

// The countdown ticks every second from a cached deadline; the database is
// only re-read (to pick up extensions or a submit) and the session kept alive
// every REFRESH_MS. Must stay well under saveAnswer's 60 s offline threshold.
const TICK_MS = 1000;
const REFRESH_MS = 15_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId: subIdStr } = await params;
  const submissionId = parseInt(subIdStr, 10);

  if (isNaN(submissionId)) {
    return new Response("Invalid submission ID", { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let intervalId: NodeJS.Timeout | undefined;
      let closed = false;
      let endsAt: Date | null = null;
      let lastRefresh = 0;

      const close = () => {
        if (closed) return;
        closed = true;
        if (intervalId) clearInterval(intervalId);
        controller.close();
      };

      const send = (timeRemaining: number) => {
        if (!closed) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ timeRemaining })}\n\n`)
          );
        }
      };

      const refresh = async () => {
        // Set first so overlapping ticks don't start a second refresh.
        lastRefresh = Date.now();
        const submission = await prisma.submission.findFirst({
          where: { id: submissionId, studentId: userId },
          select: {
            status: true,
            startedAt: true,
            extraTime: true,
            exam: { select: { enableTimer: true, duration: true, endTime: true } },
          },
        });

        if (!submission || submission.status !== "IN_PROGRESS") {
          endsAt = null;
          return;
        }

        await prisma.submission.update({
          where: { id: submissionId },
          data: { lastSyncedAt: new Date() },
        });

        endsAt = getExamEndsAt(submission, submission.exam);
      };

      const tick = async () => {
        try {
          if (Date.now() - lastRefresh >= REFRESH_MS) await refresh();

          const timeRemaining = endsAt ? getTimeRemainingSeconds(endsAt) : 0;
          send(timeRemaining);
          if (timeRemaining <= 0) close();
        } catch (err) {
          if (intervalId) clearInterval(intervalId);
          closed = true;
          controller.error(err);
        }
      };

      req.signal.addEventListener("abort", close);

      await tick();
      if (!closed) intervalId = setInterval(tick, TICK_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
