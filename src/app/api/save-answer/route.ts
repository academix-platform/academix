import { NextRequest, NextResponse } from "next/server";
import { saveAnswer } from "@/lib/actions/examWorkflow.actions";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let data;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("text/plain")) {
      const text = await req.text();
      data = JSON.parse(text);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      data = Object.fromEntries(formData.entries());
      if (data.submissionId) data.submissionId = Number(data.submissionId);
      if (data.questionId) data.questionId = Number(data.questionId);
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    const result = await saveAnswer({ success: true, error: false }, data);

    if (result.error) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
