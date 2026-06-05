"use client";

import { Question } from "@prisma/client";
import { useState } from "react";
import {
  parseAnswerList,
  parseStoredAnswer,
  serializeAnswerList,
} from "@/lib/examAnswerUtils";
import FileUploadRenderer from "./FileUploadRenderer";

interface QuestionRendererProps {
  question: Question;
  savedAnswer: string | null;
  savedAnswerRecord?: (Answer & Record<string, unknown>) | null;
  submissionId: number;
  examId: number;
  onChange: (questionId: number, value: string) => void;
  disabled?: boolean;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

import type { Answer } from "@prisma/client";

export default function QuestionRenderer({
  question,
  savedAnswer,
  savedAnswerRecord,
  submissionId,
  examId,
  onChange,
  disabled = false,
  onUploadStart,
  onUploadEnd,
}: QuestionRendererProps) {
  const handleMultipleChoice = (option: string, checked: boolean) => {
    let currentAns = parseAnswerList(savedAnswer);

    if (question.allowMultiple) {
      if (checked) {
        if (!currentAns.includes(option)) {
          currentAns.push(option);
        }
      } else {
        currentAns = currentAns.filter((o) => o !== option);
      }
    } else {
      currentAns = [option];
    }

    onChange(
      question.id,
      question.allowMultiple
        ? JSON.stringify(currentAns)
        : serializeAnswerList(currentAns),
    );
  };

  return (
    <div className="w-full">
      {/* TRUE_FALSE */}
      {question.type === "TRUE_FALSE" && (
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`q_${question.id}`}
              value="TRUE"
              checked={savedAnswer === "TRUE"}
              onChange={() => onChange(question.id, "TRUE")}
              disabled={disabled}
              className="w-4 h-4 text-academixPurpleDark"
            />
            <span className="text-gray-700">True</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`q_${question.id}`}
              value="FALSE"
              checked={savedAnswer === "FALSE"}
              onChange={() => onChange(question.id, "FALSE")}
              disabled={disabled}
              className="w-4 h-4 text-academixPurpleDark"
            />
            <span className="text-gray-700">False</span>
          </label>
        </div>
      )}

      {/* MCQ */}
      {question.type === "MCQ" && (
        <div className="flex flex-col gap-3">
          {(() => {
            const selectedAnswers = parseStoredAnswer(
              savedAnswer,
              question.allowMultiple,
            );
            const rawOptions = Array.isArray(question.options)
              ? question.options
              : [];
            const options = rawOptions.filter(
              (o): o is string => typeof o === "string",
            );

            return options.map((option, idx) => {
              const isChecked = question.allowMultiple
                ? selectedAnswers.includes(option)
                : selectedAnswers[0] === option;
              return (
                <label
                  key={idx}
                  className="flex items-center gap-2 hover:bg-gray-50 p-2 border border-transparent hover:border-gray-200 rounded-md transition-colors cursor-pointer"
                >
                  <input
                    type={question.allowMultiple ? "checkbox" : "radio"}
                    name={`q_${question.id}`}
                    value={option}
                    checked={isChecked}
                    onChange={(e) =>
                      handleMultipleChoice(option, e.target.checked)
                    }
                    disabled={disabled}
                    className="w-4 h-4 text-academixPurpleDark"
                  />
                  <span className="text-gray-700 text-sm">{option}</span>
                </label>
              );
            });
          })()}
          {question.allowMultiple && (
            <p className="mt-1 text-gray-400 text-xs">
              * You may select more than one answer.
            </p>
          )}
        </div>
      )}

      {/* TEXT */}
      {question.type === "TEXT" && (
        <textarea
          rows={5}
          placeholder="Write your answer here..."
          value={savedAnswer ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-academixPurpleDark/50 w-full resize-y"
        />
      )}

      {/* FILE */}
      {question.type === "FILE" && (
        <FileUploadRenderer
          answerId={(savedAnswerRecord as any)?.id ?? null}
          submissionId={submissionId}
          examId={examId}
          questionId={question.id}
          question={question}
          initialFileUrl={(savedAnswerRecord as any)?.fileUrl ?? null}
          initialFilePublicId={(savedAnswerRecord as any)?.filePublicId ?? null}
          initialFileOriginalName={(savedAnswerRecord as any)?.fileOriginalName ?? null}
          initialFileMimeType={(savedAnswerRecord as any)?.fileMimeType ?? null}
          initialFileSizeBytes={(savedAnswerRecord as any)?.fileSizeBytes ?? null}
          disabled={disabled}
          onUploadStart={onUploadStart}
          onUploadEnd={onUploadEnd}
          onFileMetaSaved={(meta) => onChange(question.id, meta.fileUrl)}
        />
      )}
    </div>
  );
}
