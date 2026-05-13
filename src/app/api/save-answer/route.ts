import { NextRequest, NextResponse } from "next/server";
import { saveAnswer } from "@/lib/actions/examWorkflow.actions";
import { saveAnswerSchema } from "@/lib/formValidationSchemas";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawData: unknown;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      rawData = await req.json();
    } else if (contentType.includes("text/plain")) {
      const text = await req.text();
      rawData = JSON.parse(text);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      rawData = Object.fromEntries(formData.entries());
    } else {
      return NextResponse.json(
        { error: "Unsupported content type" },
        { status: 400 },
      );
    }

    const data = saveAnswerSchema.parse(rawData);
    const result = await saveAnswer({ success: true, error: false }, data);

    if (result.error) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
