import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { autoSubmitExpiredSubmissions } from "@/lib/exams/grading";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await autoSubmitExpiredSubmissions();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron:auto-submit]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
