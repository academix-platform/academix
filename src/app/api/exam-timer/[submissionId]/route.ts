import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

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
      let intervalId: NodeJS.Timeout;

      const sendTime = async () => {
        try {
          const submission = await prisma.submission.findFirst({
            where: {
              id: submissionId,
              studentId: userId,
            },
            include: { exam: true },
          });

          if (!submission || submission.status !== "IN_PROGRESS") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ timeRemaining: 0 })}\n\n`));
            controller.close();
            if (intervalId) clearInterval(intervalId);
            return;
          }

          const examEndsAt = new Date(
            submission.startedAt.getTime() +
            ((submission.exam.duration ?? 0) + (submission.extraTime ?? 0)) * 60000
          );
          
          const timeRemaining = Math.max(0, Math.floor((examEndsAt.getTime() - Date.now()) / 1000));
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ timeRemaining })}\n\n`));

          if (timeRemaining <= 0) {
            controller.close();
            if (intervalId) clearInterval(intervalId);
          }
        } catch (err) {
          controller.error(err);
          if (intervalId) clearInterval(intervalId);
        }
      };

      await sendTime();
      intervalId = setInterval(sendTime, 1000);

      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
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
