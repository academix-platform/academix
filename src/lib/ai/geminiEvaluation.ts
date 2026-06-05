import { GoogleGenAI } from "@google/genai";

export type AiEvaluationInput = {
  questionText: string;
  modelAnswer?: string | null;
  rubric?: string | null;
  studentAnswer: string;
  maxScore: number;
};

export type AiPdfEvaluationInput = Omit<AiEvaluationInput, "studentAnswer"> & {
  pdfBuffer: Buffer;
  fileName?: string | null;
};

export type AiEvaluationSuggestion = {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  needsReview: boolean;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const clampScore = (score: unknown, maxScore: number) => {
  const numeric = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(maxScore, Math.max(0, numeric));
};

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);
};

const extractJsonObject = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return JSON.");
  }
  return candidate.slice(start, end + 1);
};

const buildEvaluationPrompt = ({
  questionText,
  modelAnswer,
  rubric,
  maxScore,
  studentAnswer,
}: AiEvaluationInput) => `You are helping a teacher grade a student answer. Your result is only a suggestion; the teacher will approve or edit it.

Return only valid JSON with this shape:
{
  "score": number,
  "feedback": "short teacher-facing feedback",
  "strengths": ["short bullet"],
  "weaknesses": ["short bullet"],
  "needsReview": boolean
}

Max score: ${maxScore}
Question:
${questionText}

Model answer / rubric:
${modelAnswer || rubric || "No model answer was provided. Grade using the question and general correctness."}

Student answer:
${studentAnswer}`;

const parseGeminiEvaluation = (
  rawText: string,
  maxScore: number,
): AiEvaluationSuggestion => {
  const parsed = JSON.parse(extractJsonObject(rawText)) as Record<string, unknown>;

  return {
    score: clampScore(parsed.score, maxScore),
    feedback: String(parsed.feedback ?? "").trim() || "No feedback provided.",
    strengths: toStringArray(parsed.strengths),
    weaknesses: toStringArray(parsed.weaknesses),
    needsReview: Boolean(parsed.needsReview ?? true),
  };
};

export async function evaluateWithGemini(
  input: AiEvaluationInput,
): Promise<{ suggestion: AiEvaluationSuggestion; model: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildEvaluationPrompt(input),
          },
        ],
      },
    ],
  });

  const rawText = response.text ?? "";
  const suggestion = parseGeminiEvaluation(rawText, input.maxScore);

  return { suggestion, model: GEMINI_MODEL };
}

export async function evaluatePdfWithGemini(
  input: AiPdfEvaluationInput,
): Promise<{ suggestion: AiEvaluationSuggestion; model: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildEvaluationPrompt({
              questionText: input.questionText,
              modelAnswer: input.modelAnswer,
              rubric: input.rubric,
              studentAnswer:
                "The student's answer is attached as a PDF file. Read the PDF and grade it against the question and rubric.",
              maxScore: input.maxScore,
            }),
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: input.pdfBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
  });

  const rawText = response.text ?? "";
  const suggestion = parseGeminiEvaluation(rawText, input.maxScore);

  return { suggestion, model: GEMINI_MODEL };
}
