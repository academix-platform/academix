import { NextRequest, NextResponse } from "next/server";
import { autoSubmitExpiredSubmissions } from "@/lib/actions/examWorkflow.actions";

const validateCronSecret = (req: NextRequest): boolean => {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === process.env.CRON_SECRET) return true;
  }

  const { searchParams } = new URL(req.url);
  const secretParam = searchParams.get("secret");
  if (secretParam === process.env.CRON_SECRET) return true;

  return false;
};

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
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
