"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  createExamWorkflowSchema,
  CreateExamWorkflowSchema,
} from "@/lib/formValidationSchemas";
import {
  createExamWorkflow,
  updateExamWorkflow,
} from "@/lib/actions/examWorkflow.actions";
import { useEffect, useMemo, useState, useRef } from "react";
import InputField from "../InputField";
import { FileText } from "lucide-react";

type ExamWorkflowFormProps = {
  subjects: { id: number; name: string }[];
  classes: { id: number; name: string }[];
  mode?: "create" | "update";
  examId?: number;
  teacherLessons: { subjectId: number; classId: number }[];
  initialData?: Omit<
    Partial<CreateExamWorkflowSchema>,
    "startTime" | "endTime"
  > & {
    startTime?: string | Date;
    endTime?: string | Date;
  };
};

const toDateTimeLocalValue = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string") return value;

  const offsetMs = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
};

function QuestionEditor({
  index,
  control,
  register,
  setValue,
  errors,
  isSubmitted,
  removeQuestion,
}: {
  index: number;
  control: any;
  register: any;
  setValue: any;
  errors: any;
  isSubmitted: boolean;
  removeQuestion: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const optionsPath = `questions.${index}.options` as const;
  const correctPath = `questions.${index}.correctAnswer` as const;
  const allowMultiplePath = `questions.${index}.allowMultiple` as const;
  const typePath = `questions.${index}.type` as const;
  const fileConfigPath = `questions.${index}.fileConfig` as const;

  const qType = useWatch({ control, name: typePath }) ?? "TEXT";
  const typeField = register(typePath);
  const allowMultiple =
    useWatch({ control, name: `questions.${index}.allowMultiple` }) ?? false;
  const correctAnswers: string[] = useWatch({
    control,
    name: correctPath,
    defaultValue: [],
  } as any) ?? [];
  const currentOptions: string[] = useWatch({
    control,
    name: optionsPath,
    defaultValue: [],
  } as any) ?? [];

  const [selectedIndexes, setSelectedIndexes] = useState<number[]>(() => {
    if (!currentOptions.length || !correctAnswers.length) return [];
    return currentOptions
      .map((opt: string, i: number) => (correctAnswers.includes(opt) ? i : -1))
      .filter((i: number) => i >= 0);
  });

  const selectedTrueFalse = useMemo<"TRUE" | "FALSE" | null>(() => {
    if ((correctAnswers ?? [])[0] === "FALSE") return "FALSE";
    if ((correctAnswers ?? [])[0] === "TRUE") return "TRUE";
    return null;
  }, [correctAnswers]);

  const lockScroll = () => {
    const currentScrollY = window.scrollY;
    const mainContentContainer = containerRef.current?.closest('.overflow-auto');
    const containerScrollTop = mainContentContainer ? mainContentContainer.scrollTop : 0;

    window.scrollTo(0, currentScrollY);
    if (mainContentContainer) {
      mainContentContainer.scrollTop = containerScrollTop;
    }

    requestAnimationFrame(() => {
      window.scrollTo(0, currentScrollY);
      if (mainContentContainer) {
        mainContentContainer.scrollTop = containerScrollTop;
      }
      containerRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
    });
  };

  const setOptions = (next: string[]) => {
    setValue(optionsPath, next, { shouldDirty: true });
  };

  const appendOption = () => {
    lockScroll();
    setOptions([...currentOptions, ""]);
  };

  const removeOptionAt = (idx: number) => {
    lockScroll();

    const nextSelected = selectedIndexes
      .filter((si) => si !== idx)
      .map((si) => (si > idx ? si - 1 : si));
    setSelectedIndexes(nextSelected);

    const next = currentOptions.filter((_: string, i: number) => i !== idx);
    setOptions(next);

    const nextCorrect = nextSelected
      .map((si) => next[si])
      .filter((v): v is string => Boolean(v?.trim()));
    setValue(correctPath, nextCorrect, { shouldDirty: true, shouldValidate: true });
  };

  const handleQuestionTypeChange = (nextType: string) => {
    lockScroll();

    if (nextType === "MCQ") {
      setOptions(["", "", "", ""]);
      setSelectedIndexes([]);
      setValue(correctPath, [], { shouldDirty: true, shouldValidate: true });
      setValue(allowMultiplePath, false, { shouldDirty: true, shouldValidate: true });
      setValue(fileConfigPath, undefined, { shouldDirty: true });
    } else if (nextType === "TRUE_FALSE") {
      setOptions(["True", "False"]);
      setSelectedIndexes([]);
      setValue(correctPath, ["TRUE"], { shouldDirty: true, shouldValidate: true });
      setValue(allowMultiplePath, false, { shouldDirty: true, shouldValidate: true });
      setValue(fileConfigPath, undefined, { shouldDirty: true });
    } else if (nextType === "FILE") {
      setOptions([]);
      setSelectedIndexes([]);
      setValue(correctPath, [], { shouldDirty: true, shouldValidate: true });
      setValue(allowMultiplePath, false, { shouldDirty: true, shouldValidate: true });
      setValue(fileConfigPath, {
        allowedExtensions: [],
        minFileSizeMb: 0,
        maxFileSizeMb: 10,
        instructions: "",
      }, { shouldDirty: true });
    } else {
      setOptions([]);
      setSelectedIndexes([]);
      setValue(correctPath, [], { shouldDirty: true, shouldValidate: true });
      setValue(allowMultiplePath, false, { shouldDirty: true, shouldValidate: true });
      setValue(fileConfigPath, undefined, { shouldDirty: true });
    }
  };

  useEffect(() => {
    if (qType !== "MCQ" || selectedIndexes.length === 0) return;

    const nextCorrect = selectedIndexes
      .map((si) => currentOptions[si])
      .filter((v): v is string => Boolean(v?.trim()));

    if (JSON.stringify(nextCorrect) !== JSON.stringify(correctAnswers)) {
      setValue(correctPath, nextCorrect, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [correctAnswers, correctPath, currentOptions, qType, selectedIndexes, setValue]);

  const toggleMcqAnswer = (optionIndex: number, checked: boolean) => {
    const optionValue = currentOptions[optionIndex];
    if (checked && (!optionValue || !optionValue.trim())) {
      toast.error("Please write the option text before marking it as correct!");
      return;
    }

    lockScroll();

    let nextSelected: number[];

    if (allowMultiple) {
      nextSelected = checked
        ? Array.from(new Set([...selectedIndexes, optionIndex])).sort((a, b) => a - b)
        : selectedIndexes.filter((i) => i !== optionIndex);
    } else {
      nextSelected = checked ? [optionIndex] : [];
    }

    setSelectedIndexes(nextSelected);

    const nextCorrect = nextSelected
      .map((si) => currentOptions[si])
      .filter((v): v is string => Boolean(v?.trim()));

    setValue(correctPath, nextCorrect, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleTrueFalse = (value: "TRUE" | "FALSE") => {
    lockScroll();
    setValue(correctPath, [value], { shouldDirty: true, shouldValidate: true });
  };

  // فحص ما إذا كان هناك أي خيار فارغ داخل السؤال الحالي
  const hasEmptyOption = currentOptions.some((opt) => !opt || !opt.trim());

  return (
    <div ref={containerRef} className="relative space-y-4 bg-white p-4 border rounded-md">
      <button
        type="button"
        onClick={removeQuestion}
        className="top-4 right-4 absolute font-bold text-red-500"
      >
        X
      </button>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
        <InputField
          label="Question Text"
          name={`questions.${index}.text`}
          register={register}
          error={errors?.questions?.[index]?.text}
        />

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">Type</label>
          <select
            {...typeField}
            onChange={(e) => {
              typeField.onChange(e);
              handleQuestionTypeChange(e.target.value);
            }}
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
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
        <div className="space-y-4 p-4 border border-gray-300 border-dashed rounded-md">
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register(allowMultiplePath)} />
            <span className="text-gray-700 text-sm">
              Allow multiple correct answers
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700 text-sm">Options</h3>
              <button
                type="button"
                onClick={() => appendOption()}
                className="text-blue-600 text-sm hover:underline"
              >
                + Add Option
              </button>
            </div>

            {currentOptions.map((_optValue: string, optionIndex: number) => {
              const isSelected = selectedIndexes.includes(optionIndex);

              return (
                <div key={optionIndex} className="flex items-center gap-3">
                  <input
                    {...register(`questions.${index}.options.${optionIndex}`)}
                    className="flex-1 p-2 rounded-md ring-[1.5px] ring-gray-300 text-sm"
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  <label className="flex items-center gap-2 text-gray-600 text-xs">
                    <input
                      type={allowMultiple ? "checkbox" : "radio"}
                      name={`questions.${index}.correctAnswer`}
                      checked={isSelected}
                      onChange={(e) => toggleMcqAnswer(optionIndex, e.target.checked)}
                    />
                    Correct
                  </label>
                  <button
                    type="button"
                    onClick={() => removeOptionAt(optionIndex)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            {/* إظهار الخطأ فوراً في حال حاول المعلم إنشاء الاختبار وهناك خيارات فارغة */}
            {(errors?.questions?.[index]?.options?.message || (isSubmitted && hasEmptyOption)) && (
              <p className="font-medium text-red-500 text-xs mt-1">
                {errors?.questions?.[index]?.options?.message?.toString() || "⚠️ All option fields must be filled. Please do not leave empty options."}
              </p>
            )}
          </div>

          <div className="font-medium text-gray-700 text-sm">
            Select one correct answer, or more if multiple answers are allowed.
          </div>
        </div>
      )}

      {qType === "TRUE_FALSE" && (
        <div className="space-y-3 p-4 border border-gray-300 border-dashed rounded-md">
          <h3 className="font-medium text-gray-700 text-sm">Correct Answer</h3>
          <div className="flex flex-wrap gap-6">
            {["TRUE", "FALSE"].map((value) => (
              <label
                key={value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`questions.${index}.correctAnswer`}
                  checked={selectedTrueFalse === value}
                  onChange={() => toggleTrueFalse(value as "TRUE" | "FALSE")}
                />
                <span className="text-gray-700 text-sm">
                  {value === "TRUE" ? "True" : "False"}
                </span>
              </label>
            ))}
          </div>
          {errors?.questions?.[index]?.correctAnswer?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.questions[index]?.correctAnswer?.message?.toString()}
            </p>
          )}
        </div>
      )}

      {qType === "TEXT" && (
        <div className="space-y-3 p-4 border border-gray-300 border-dashed rounded-md">
          <h3 className="font-medium text-gray-700 text-sm">Correct Answer</h3>
          <textarea
            {...register(`questions.${index}.textAnswer`)}
            className="w-full p-3 border-2 border-gray-200 focus:border-academixPurpleDark focus:outline-none rounded-lg text-sm min-h-[100px] transition-all"
            placeholder="Write the correct answer here..."
          />
          {errors?.questions?.[index]?.textAnswer?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.questions[index]?.textAnswer?.message?.toString()}
            </p>
          )}
        </div>
      )}

      {qType === "FILE" && (
        <div className="space-y-4 p-4 border border-gray-300 border-dashed rounded-md">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-academixPurpleDark" />
            <h3 className="font-medium text-gray-700 text-sm">File Upload Settings</h3>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-gray-700 text-xs">Allowed File Extensions</label>
            <input
              type="text"
              className="w-full p-2 border-2 border-gray-200 focus:border-academixPurpleDark focus:outline-none rounded-lg text-sm transition-all"
              placeholder="e.g. pdf, docx, jpg"
              {...register(`questions.${index}.fileConfig.allowedExtensions`, {
                setValueAs: (v: any) => {
                  if (Array.isArray(v)) return v;
                  if (typeof v === "string") {
                    if (!v.trim()) return [];
                    return v
                      .split(",")
                      .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
                      .filter(Boolean);
                  }
                  return [];
                },
              })}
              defaultValue={(() => {
                const currentVal = control._formValues.questions?.[index]?.fileConfig?.allowedExtensions;
                return Array.isArray(currentVal) ? currentVal.join(", ") : currentVal ?? "";
              })()}
              onBlur={(e) => {
                setValue(`questions.${index}.fileConfig.allowedExtensions`, e.target.value, {
                  shouldDirty: true,
                  shouldValidate: true
                });
              }}
            />
            <p className="text-xs text-gray-400">Leave empty to accept all file types (Optional)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-medium text-gray-700 text-xs">Min File Size (MB)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                {...register(`questions.${index}.fileConfig.minFileSizeMb`, { valueAsNumber: true })}
                className="w-full p-2 border-2 border-gray-200 focus:border-academixPurpleDark focus:outline-none rounded-lg text-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-gray-700 text-xs">Max File Size (MB)</label>
              <input
                type="number"
                min={1}
                max={10}
                step={0.1}
                {...register(`questions.${index}.fileConfig.maxFileSizeMb`, { valueAsNumber: true })}
                className="w-full p-2 border-2 border-gray-200 focus:border-academixPurpleDark focus:outline-none rounded-lg text-sm transition-all"
              />
              <p className="text-xs text-gray-400">System max: 10 MB</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-gray-700 text-xs">Instructions for Student (optional)</label>
            <textarea
              rows={3}
              {...register(`questions.${index}.fileConfig.instructions`)}
              className="w-full p-3 border-2 border-gray-200 focus:border-academixPurpleDark focus:outline-none rounded-lg text-sm min-h-[60px] transition-all"
              placeholder="e.g. Upload your essay as a PDF file..."
            />
          </div>

          <p className="text-xs text-gray-400 italic">FILE questions are graded manually.</p>

          {errors?.questions?.[index]?.fileConfig?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.questions[index]?.fileConfig?.message?.toString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExamWorkflowForm({
  subjects,
  classes,
  mode = "create",
  examId,
  initialData,
  teacherLessons,
}: ExamWorkflowFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<CreateExamWorkflowSchema>({
    resolver: zodResolver(createExamWorkflowSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      startTime: toDateTimeLocalValue(initialData?.startTime) as any,
      endTime: toDateTimeLocalValue(initialData?.endTime) as any,
      subjectId: initialData?.subjectId,
      classIds: (initialData?.classIds ?? []).map(String) as any,
      enableTimer: initialData?.enableTimer ?? true,
      duration: initialData?.duration,
      enableNavigation: initialData?.enableNavigation ?? true,
      enableAutoSave: initialData?.enableAutoSave ?? true,
      autoSaveInterval: initialData?.autoSaveInterval ?? 30,
      enableAutoSubmit: initialData?.enableAutoSubmit ?? true,
      questionsPerPage: initialData?.questionsPerPage ?? 1,
      questions: (initialData?.questions ?? [
        {
          type: "TEXT",
          text: "",
          points: 1,
          order: 1,
          allowMultiple: false,
          options: [],
          correctAnswer: [],
          textAnswer: "",
        },
      ]).map((q) => ({
        ...q,
        textAnswer: q.textAnswer ?? "",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  const watchEnableTimer = watch("enableTimer");
  const watchSubjectId = watch("subjectId");

  const filteredClasses = useMemo(() => {
    if (!watchSubjectId) {
      return [];
    }

    const subjectId = Number(watchSubjectId);
    const validClassIds = new Set(
      teacherLessons
        .filter((l) => l.subjectId === subjectId)
        .map((l) => l.classId),
    );
    return classes.filter((c) => validClassIds.has(c.id));
  }, [classes, teacherLessons, watchSubjectId]);

  const onSubmit = async (data: CreateExamWorkflowSchema) => {
    // التحقق النهائي عند الضغط على الحفظ لمنع إرسال الفورم تماماً بوجود خيارات فارغة
    if (data.questions && data.questions.length > 0) {
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        if (q.type === "MCQ") {
          const hasEmptyOption = q.options?.some((opt) => !opt || !opt.trim());
          if (hasEmptyOption) {
            toast.error(`Question #${i + 1} has empty options! Please fill in all option fields.`);
            return;
          }
          if (!q.correctAnswer || q.correctAnswer.length === 0) {
            toast.error(`Please select at least one correct answer for Question #${i + 1}.`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      const res =
        mode === "update" && examId
          ? await updateExamWorkflow({ success: true, error: false }, examId, data)
          : await createExamWorkflow({ success: true, error: false }, data);
      if (res.error) {
        toast.error(res.message);
      } else {
        toast.success(
          mode === "update"
            ? "Exam updated successfully!"
            : "Exam created successfully!",
        );
        router.push("/list/exams");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
      <section className="space-y-4 bg-gray-50 p-4 border rounded-md">
        <h2 className="font-bold text-gray-900 text-2xl">1. Basic Information</h2>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
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
            <label className="font-medium text-gray-700 text-sm">Subject</label>
            <select
              {...register("subjectId")}
              className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
            >
              <option value="">Select a subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.subjectId?.message && (
              <p className="font-medium text-red-500 text-xs">{errors.subjectId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 md:col-span-2 w-full">
            <label className="font-medium text-gray-700 text-sm">Classes</label>
            <div className="flex flex-wrap gap-4">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      value={String(c.id)}
                      {...register("classIds")}
                    />
                    <span>{c.name}</span>
                  </label>
                ))
              ) : (
                <p className="italic text-gray-400 text-sm">
                  {watchSubjectId
                    ? "No classes found for this subject."
                    : "Select a subject first to see available classes."}
                </p>
              )}
            </div>
            {errors.classIds?.message && (
              <p className="font-medium text-red-500 text-xs">{errors.classIds.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 bg-gray-50 p-4 border rounded-md">
        <h2 className="font-bold text-gray-900 text-2xl">2. Settings</h2>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
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

      <section className="space-y-4 bg-gray-50 p-4 border rounded-md">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-900 text-2xl">3. Questions</h2>
          <button
            type="button"
            onClick={() =>
              append({
                type: "TEXT",
                text: "",
                points: 1,
                order: fields.length + 1,
                allowMultiple: false,
                options: [],
                correctAnswer: [],
                textAnswer: "",
              })
            }
            className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md w-fit text-white transition-all"
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
              isSubmitted={isSubmitted}
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
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md w-fit text-white transition-all"
      >
        {isSubmitting
          ? mode === "update"
            ? "Updating..."
            : "Creating..."
          : mode === "update"
            ? "Update Exam"
            : "Create Exam"}
      </button>
    </form>
  );
}