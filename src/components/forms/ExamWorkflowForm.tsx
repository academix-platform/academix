"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  createExamWorkflowSchema,
  CreateExamWorkflowSchema,
} from "@/lib/formValidationSchemas";
import { createExamWorkflow } from "@/lib/actions/examWorkflow.actions";
import { useEffect, useState } from "react";
import InputField from "../InputField";

type ExamWorkflowFormProps = {
  subjects: { id: number; name: string }[];
  classes: { id: number; name: string }[];
};

function QuestionEditor({
  index,
  control,
  register,
  setValue,
  errors,
  removeQuestion,
}: {
  index: number;
  control: any;
  register: any;
  setValue: any;
  errors: any;
  removeQuestion: () => void;
}) {
  const optionsPath = `questions.${index}.options` as const;
  const correctPath = `questions.${index}.correctAnswer` as const;
  const allowMultiplePath = `questions.${index}.allowMultiple` as const;
  const typePath = `questions.${index}.type` as const;
  const qType =
    useWatch({ control, name: typePath }) ?? "TEXT";
  const typeField = register(typePath);
  const allowMultiple =
    useWatch({ control, name: `questions.${index}.allowMultiple` }) ?? false;
  const correctAnswers = useWatch({
    control,
    name: correctPath,
    defaultValue: [],
  });
  const currentOptions = useWatch({
    control,
    name: optionsPath,
    defaultValue: [],
  });
  const [selectedOptionIndexes, setSelectedOptionIndexes] = useState<number[]>(
    [],
  );
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<
    "TRUE" | "FALSE" | null
  >(null);

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
    replace: replaceOptions,
  } = useFieldArray({
    control,
    name: optionsPath,
  });

  const handleQuestionTypeChange = (nextType: string) => {
    if (nextType === "MCQ") {
      replaceOptions(["", "", "", ""]);
      setSelectedOptionIndexes([]);
      setSelectedTrueFalse(null);
      setValue(correctPath, [], { shouldDirty: true, shouldValidate: true });
      setValue(allowMultiplePath, false, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (nextType === "TRUE_FALSE") {
      replaceOptions(["True", "False"]);
      setSelectedOptionIndexes([]);
      setSelectedTrueFalse("TRUE");
      setValue(correctPath, ["TRUE"], {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(allowMultiplePath, false, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    replaceOptions([]);
    setSelectedOptionIndexes([]);
    setSelectedTrueFalse(null);
    setValue(correctPath, [], { shouldDirty: true, shouldValidate: true });
    setValue(allowMultiplePath, false, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  useEffect(() => {
    if (qType !== "MCQ") return;

    const nextCorrectAnswers = selectedOptionIndexes
      .map((optionIndex) => currentOptions[optionIndex])
      .filter((value): value is string => Boolean(value?.trim()));

    if (JSON.stringify(nextCorrectAnswers) !== JSON.stringify(correctAnswers)) {
      setValue(correctPath, nextCorrectAnswers, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [
    correctAnswers,
    correctPath,
    currentOptions,
    qType,
    selectedOptionIndexes,
    setValue,
  ]);

  useEffect(() => {
    if (qType !== "TRUE_FALSE") return;
    if (!selectedTrueFalse) return;

    if (correctAnswers[0] !== selectedTrueFalse) {
      setValue(correctPath, [selectedTrueFalse], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [correctAnswers, correctPath, qType, selectedTrueFalse, setValue]);

  const syncSelectionAfterRemoval = (removedIndex: number) => {
    setSelectedOptionIndexes((prev) =>
      prev
        .filter((indexValue) => indexValue !== removedIndex)
        .map((indexValue) =>
          indexValue > removedIndex ? indexValue - 1 : indexValue,
        ),
    );
  };

  const toggleMcqAnswer = (optionIndex: number, checked: boolean) => {
    if (allowMultiple) {
      setSelectedOptionIndexes((prev) =>
        checked
          ? Array.from(new Set([...prev, optionIndex])).sort((a, b) => a - b)
          : prev.filter((indexValue) => indexValue !== optionIndex),
      );
      return;
    }

    setSelectedOptionIndexes(checked ? [optionIndex] : []);
  };

  const toggleTrueFalse = (value: "TRUE" | "FALSE") => {
    setSelectedTrueFalse(value);
    setValue(correctPath, [value], { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="p-4 border bg-white rounded-md space-y-4 relative">
      <button
        type="button"
        onClick={removeQuestion}
        className="absolute top-4 right-4 text-red-500 font-bold"
      >
        X
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField
          label="Question Text"
          name={`questions.${index}.text`}
          register={register}
          error={errors?.questions?.[index]?.text}
        />

        <div className="flex flex-col gap-2 w-full">
          <label className="text-xs text-gray-500">Type</label>
          <select
            {...typeField}
            onChange={(e) => {
              typeField.onChange(e);
              handleQuestionTypeChange(e.target.value);
            }}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          >
            <option value="TEXT">Text Answer</option>
            <option value="MCQ">Multiple Choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILE">File Upload</option>
          </select>
        </div>

        <InputField
          label="Points"
          name={`questions.${index}.points`}
          type="number"
          register={register}
          error={errors?.questions?.[index]?.points}
        />
      </div>

      {qType === "MCQ" && (
        <div className="space-y-4 rounded-md border border-dashed border-gray-300 p-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register(allowMultiplePath)} />
            <span className="text-sm text-gray-700">
              Allow multiple correct answers
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Options</h3>
              <button
                type="button"
                onClick={() => appendOption("")}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add Option
              </button>
            </div>

            {optionFields.map((field, optionIndex) => {
              const isSelected = selectedOptionIndexes.includes(optionIndex);

              return (
                <div key={field.id} className="flex items-center gap-3">
                  <input
                    {...register(`questions.${index}.options.${optionIndex}`)}
                    className="flex-1 ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type={allowMultiple ? "checkbox" : "radio"}
                      name={`questions.${index}.correctAnswer`}
                      checked={isSelected}
                      onChange={(e) =>
                        toggleMcqAnswer(optionIndex, e.target.checked)
                      }
                    />
                    Correct
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      syncSelectionAfterRemoval(optionIndex);
                      removeOption(optionIndex);
                    }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            {errors?.questions?.[index]?.options?.message && (
              <p className="text-xs text-red-400">
                {errors.questions[index]?.options?.message?.toString()}
              </p>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Select one correct answer, or more if multiple answers are allowed.
          </div>
        </div>
      )}

      {qType === "TRUE_FALSE" && (
        <div className="space-y-3 rounded-md border border-dashed border-gray-300 p-4">
          <h3 className="text-sm font-medium text-gray-700">Correct Answer</h3>
          <div className="flex flex-wrap gap-6">
            {["TRUE", "FALSE"].map((value) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`questions.${index}.correctAnswer`}
                  checked={selectedTrueFalse === value}
                  onChange={() => toggleTrueFalse(value as "TRUE" | "FALSE")}
                />
                <span className="text-sm text-gray-700">
                  {value === "TRUE" ? "True" : "False"}
                </span>
              </label>
            ))}
          </div>
          {errors?.questions?.[index]?.correctAnswer?.message && (
            <p className="text-xs text-red-400">
              {errors.questions[index]?.correctAnswer?.message?.toString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExamWorkflowForm({ subjects, classes }: ExamWorkflowFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateExamWorkflowSchema>({
    resolver: zodResolver(createExamWorkflowSchema),
    defaultValues: {
      classIds: [],
      enableTimer: true,
      enableNavigation: true,
      enableAutoSave: true,
      autoSaveInterval: 30,
      enableAutoSubmit: true,
      questionsPerPage: 1,
      questions: [
        { type: "TEXT", text: "", points: 1, order: 1, allowMultiple: false, options: [], correctAnswer: [] },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  const watchEnableTimer = watch("enableTimer");

  const onSubmit = async (data: CreateExamWorkflowSchema) => {
    setIsSubmitting(true);
    try {
      const res = await createExamWorkflow({ success: true, error: false }, data);
      if (res.error) {
        toast.error(res.message);
      } else {
        toast.success("Exam created successfully!");
        router.push("/list/exams");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)}>
      <section className="space-y-4 border p-4 rounded-md bg-gray-50">
        <h2 className="text-xl font-semibold">1. Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Exam Title"
            name="title"
            register={register}
            error={errors.title}
          />
          <InputField
            label="Start Time"
            name="startTime"
            type="datetime-local"
            register={register}
            error={errors.startTime}
          />
          <InputField
            label="End Time"
            name="endTime"
            type="datetime-local"
            register={register}
            error={errors.endTime}
          />
          
          <div className="flex flex-col gap-2 w-full">
            <label className="text-xs text-gray-500">Subject</label>
            <select
              {...register("subjectId")}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            >
              <option value="">Select a subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.subjectId?.message && (
              <p className="text-xs text-red-400">{errors.subjectId.message}</p>
            )}
          </div>
          
          <div className="flex flex-col gap-2 w-full md:col-span-2">
            <label className="text-xs text-gray-500">Classes</label>
            <div className="flex flex-wrap gap-4">
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={c.id}
                    {...register("classIds")}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
            {errors.classIds?.message && (
              <p className="text-xs text-red-400">{errors.classIds.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 border p-4 rounded-md bg-gray-50">
        <h2 className="text-xl font-semibold">2. Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("enableTimer")} />
            <span>Enable Timer</span>
          </label>
          
          {watchEnableTimer && (
            <InputField
              label="Duration (minutes)"
              name="duration"
              type="number"
              register={register}
              error={errors.duration}
            />
          )}

          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("enableNavigation")} />
            <span>Allow Previous Page Navigation</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("enableAutoSave")} />
            <span>Enable Auto-Save</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("enableAutoSubmit")} />
            <span>Enable Auto-Submit when time is up</span>
          </label>
          
          <InputField
            label="Questions Per Page"
            name="questionsPerPage"
            type="number"
            register={register}
            error={errors.questionsPerPage}
          />
        </div>
      </section>

      <section className="space-y-4 border p-4 rounded-md bg-gray-50">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">3. Questions</h2>
          <button
            type="button"
            onClick={() =>
              append({ type: "TEXT", text: "", points: 1, order: fields.length + 1, allowMultiple: false, options: [], correctAnswer: [] })
            }
            className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm"
          >
            + Add Question
          </button>
        </div>

        {fields.map((field, index) => {
          return (
            <QuestionEditor
              key={field.id}
              index={index}
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              removeQuestion={() => remove(index)}
            />
          );
        })}
        {errors.questions?.root?.message && (
          <p className="text-red-500">{errors.questions.root.message}</p>
        )}
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-academixPurpleDark text-white p-3 rounded-md font-bold hover:bg-academixPurple"
      >
        {isSubmitting ? "Creating..." : "Create Exam Workflow"}
      </button>
    </form>
  );
}
