"use client";

import { Question } from "@prisma/client";
import { useState } from "react";
import {
  parseAnswerList,
  parseStoredAnswer,
  serializeAnswerList,
} from "@/lib/examAnswerUtils";

interface QuestionRendererProps {
  question: Question;
  savedAnswer: string | null;
  onChange: (questionId: number, value: string) => void;
  disabled?: boolean;
}

export default function QuestionRenderer({
  question,
  savedAnswer,
  onChange,
  disabled = false,
}: QuestionRendererProps) {
  const [isUploading, setIsUploading] = useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate upload for now since local upload API is not implemented yet
    setTimeout(() => {
      onChange(question.id, `/uploads/mock_${file.name}`);
      setIsUploading(false);
    }, 1000);
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
        <div className="flex flex-col gap-2">
          {savedAnswer && savedAnswer.trim() !== "" ? (
            <div className="flex items-center gap-4 bg-green-50 p-3 border border-green-200 rounded-md">
              <span className="text-green-700 text-sm">
                File uploaded successfully.
              </span>
              <button
                type="button"
                onClick={() => onChange(question.id, "")}
                disabled={disabled}
                className="text-red-500 text-sm hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <label
                className={`flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isUploading ? "Uploading..." : "Choose File"}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={disabled || isUploading}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </label>
              <span className="text-gray-500 text-xs">Max size: 10MB</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
