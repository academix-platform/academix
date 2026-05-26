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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import InputField from "../InputField";

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

const EMPTY_STRING_ARRAY: string[] = [];

type ScrollTarget = HTMLElement | Window;
type ScrollPosition = {
  target: ScrollTarget;
  top: number;
  left: number;
};
type QuestionScrollLock = {
  positions: ScrollPosition[];
  viewportTop: number;
};

const canScroll = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  const overflowY = `${style.overflowY} ${style.overflow}`;

  return /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight;
};

const getScrollTargets = (element: HTMLElement): ScrollTarget[] => {
  const targets: ScrollTarget[] = [];
  let current = element.parentElement;

  while (current) {
    if (canScroll(current)) targets.push(current);
    current = current.parentElement;
  }

  targets.push(window);
  return targets;
};

const getScrollPosition = (target: ScrollTarget): ScrollPosition => {
  if (target instanceof HTMLElement) {
    return {
      target,
      top: target.scrollTop,
      left: target.scrollLeft,
    };
  }

  return {
    target,
    top: target.scrollY,
    left: target.scrollX,
  };
};

const rememberScrollPositions = (element: HTMLElement) =>
  getScrollTargets(element).map(getScrollPosition);

const restoreScrollPositions = (positions: ScrollPosition[]) => {
  for (const position of positions) {
    if (position.target instanceof HTMLElement) {
      position.target.scrollTop = position.top;
      position.target.scrollLeft = position.left;
      continue;
    }

    position.target.scrollTo({
      top: position.top,
      left: position.left,
      behavior: "auto",
    });
  }
};

const alignElementToViewportTop = (element: HTMLElement, viewportTop: number) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const delta = element.getBoundingClientRect().top - viewportTop;

    if (Math.abs(delta) <= 1) return;

    const target = getScrollTargets(element)[0] ?? window;

    if (target instanceof HTMLElement) {
      target.scrollTop += delta;
    } else {
      target.scrollBy({ top: delta, behavior: "auto" });
    }
  }
};

const rememberQuestionScrollLock = (element: HTMLElement): QuestionScrollLock => ({
  positions: rememberScrollPositions(element),
  viewportTop: element.getBoundingClientRect().top,
});

const restoreQuestionScrollLock = (
  element: HTMLElement,
  lock: QuestionScrollLock,
) => {
  restoreScrollPositions(lock.positions);
  alignElementToViewportTop(element, lock.viewportTop);
};

function QuestionEditor({
  questionKey,
  index,
  control,
  register,
  setValue,
  errors,
  removeQuestion,
}: {
  questionKey: string;
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
  const qType = useWatch({ control, name: typePath }) ?? "TEXT";
  const typeField = register(typePath);
  const allowMultiple =
    useWatch({ control, name: `questions.${index}.allowMultiple` }) ?? false;
  const watchedCorrectAnswers: string[] | undefined = useWatch({
    control,
    name: correctPath,
    defaultValue: [],
  });
  const correctAnswers = watchedCorrectAnswers ?? EMPTY_STRING_ARRAY;
  const watchedCurrentOptions: string[] | undefined = useWatch({
    control,
    name: optionsPath,
    defaultValue: [],
  });
  const currentOptions = watchedCurrentOptions ?? EMPTY_STRING_ARRAY;
  const editorRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef<QuestionScrollLock | null>(null);

  const rememberEditorPosition = () => {
    const editor = editorRef.current;

    if (!editor) {
      pendingScrollRef.current = null;
      return;
    }

    pendingScrollRef.current = rememberQuestionScrollLock(editor);
  };

  const restoreEditorPosition = () => {
    const pendingScroll = pendingScrollRef.current;
    const editor = editorRef.current;

    if (!pendingScroll || !editor) return;
    restoreQuestionScrollLock(editor, pendingScroll);
  };

  const preserveEditorScroll = (update: () => void) => {
    rememberEditorPosition();
    update();
  };

  useLayoutEffect(() => {
    restoreEditorPosition();
  });

  useEffect(() => {
    if (!pendingScrollRef.current) return;

    const firstFrame = requestAnimationFrame(() => {
      restoreEditorPosition();
    });
    const secondFrame = requestAnimationFrame(() => {
      requestAnimationFrame(restoreEditorPosition);
    });
    const interval = window.setInterval(restoreEditorPosition, 50);
    const timeout = window.setTimeout(() => {
      restoreEditorPosition();
      pendingScrollRef.current = null;
      window.clearInterval(interval);
    }, 800);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  });

  // --- Track which option indexes are marked correct (by index, not value) ---
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

  // --- Manual option array helpers (replaces useFieldArray) ---
  const setOptions = (next: string[]) => {
    setValue(optionsPath, next, { shouldDirty: true });
  };

  const appendOption = () => setOptions([...currentOptions, ""]);

  const removeOptionAt = (idx: number) => {
    // Shrink selectedIndexes when an option is removed
    const nextSelected = selectedIndexes
      .filter((si) => si !== idx)
      .map((si) => (si > idx ? si - 1 : si));
    setSelectedIndexes(nextSelected);

    const next = currentOptions.filter((_: string, i: number) => i !== idx);
    setOptions(next);

    // Rebuild correctAnswer from remaining selected indexes
    const nextCorrect = nextSelected
      .map((si) => next[si])
      .filter((v): v is string => Boolean(v?.trim()));
    setValue(correctPath, nextCorrect, { shouldDirty: true });
  };

  const handleQuestionTypeChange = (nextType: string) => {
    preserveEditorScroll(() => {
      if (nextType === "MCQ") {
        setOptions(["", "", "", ""]);
        setSelectedIndexes([]);
        setValue(correctPath, [], { shouldDirty: true });
        setValue(allowMultiplePath, false, {
          shouldDirty: true,
        });
        return;
      }

      if (nextType === "TRUE_FALSE") {
        setOptions(["True", "False"]);
        setSelectedIndexes([]);
        setValue(correctPath, ["TRUE"], {
          shouldDirty: true,
        });
        setValue(allowMultiplePath, false, {
          shouldDirty: true,
        });
        return;
      }

      setOptions([]);
      setSelectedIndexes([]);
      setValue(correctPath, [], { shouldDirty: true });
      setValue(allowMultiplePath, false, {
        shouldDirty: true,
      });
    });
  };

  // Sync correctAnswer values when user edits option text after marking it correct
  useEffect(() => {
    if (qType !== "MCQ" || selectedIndexes.length === 0) return;

    const nextCorrect = selectedIndexes
      .map((si) => currentOptions[si])
      .filter((v): v is string => Boolean(v?.trim()));

    if (JSON.stringify(nextCorrect) !== JSON.stringify(correctAnswers)) {
      setValue(correctPath, nextCorrect, {
        shouldDirty: true,
      });
    }
  }, [correctAnswers, correctPath, currentOptions, qType, selectedIndexes, setValue]);

  const toggleMcqAnswer = (optionIndex: number, checked: boolean) => {
    preserveEditorScroll(() => {
      let nextSelected: number[];

      if (allowMultiple) {
        nextSelected = checked
          ? Array.from(new Set([...selectedIndexes, optionIndex])).sort(
              (a, b) => a - b,
            )
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
      });
    });
  };

  const toggleTrueFalse = (value: "TRUE" | "FALSE") => {
    preserveEditorScroll(() => {
      setValue(correctPath, [value], { shouldDirty: true });
    });
  };

  const toggleAllowMultiple = (checked: boolean) => {
    preserveEditorScroll(() => {
      setValue(allowMultiplePath, checked, { shouldDirty: true });

      if (checked || selectedIndexes.length <= 1) return;

      const nextSelected = selectedIndexes.slice(0, 1);
      setSelectedIndexes(nextSelected);

      const nextCorrect = nextSelected
        .map((si) => currentOptions[si])
        .filter((v): v is string => Boolean(v?.trim()));

      setValue(correctPath, nextCorrect, { shouldDirty: true });
    });
  };

  return (
    <div
      ref={editorRef}
      data-question-editor={questionKey}
      className="relative space-y-4 bg-white p-4 border rounded-md [overflow-anchor:none]"
    >
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
              const nextType = e.target.value;

              preserveEditorScroll(() => {
                typeField.onChange(e);
                handleQuestionTypeChange(nextType);
              });
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
            <input
              type="checkbox"
              {...register(allowMultiplePath)}
              onChange={(e) => toggleAllowMultiple(e.target.checked)}
            />
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
                      onChange={(e) =>
                        toggleMcqAnswer(optionIndex, e.target.checked)
                      }
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

            {errors?.questions?.[index]?.options?.message && (
              <p className="font-medium text-red-500 text-xs">
                {errors.questions[index]?.options?.message?.toString()}
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
  const formRef = useRef<HTMLFormElement>(null);
  const pendingQuestionScrollRef = useRef<{
    questionKey: string;
    lock: QuestionScrollLock;
  } | null>(null);
  const shouldScrollToNewQuestionRef = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateExamWorkflowSchema>({
    resolver: zodResolver(createExamWorkflowSchema),
    shouldFocusError: false,
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

  const watchEnableTimer = useWatch({ control, name: "enableTimer" });
  const watchSubjectId = useWatch({ control, name: "subjectId" });

  const rememberQuestionPosition = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;

    const editor = target.closest<HTMLElement>("[data-question-editor]");
    const questionKey = editor?.dataset.questionEditor;

    if (!editor || !questionKey) return;

    pendingQuestionScrollRef.current = {
      questionKey,
      lock: rememberQuestionScrollLock(editor),
    };
  };

  const restoreQuestionPosition = () => {
    const pendingScroll = pendingQuestionScrollRef.current;
    const form = formRef.current;

    if (!pendingScroll || !form) return;

    const editor = form.querySelector<HTMLElement>(
      `[data-question-editor="${pendingScroll.questionKey}"]`,
    );

    if (!editor) return;
    restoreQuestionScrollLock(editor, pendingScroll.lock);
  };

  useLayoutEffect(() => {
    restoreQuestionPosition();
  });

  useLayoutEffect(() => {
    if (!shouldScrollToNewQuestionRef.current) return;

    const form = formRef.current;
    const editors = form?.querySelectorAll<HTMLElement>("[data-question-editor]");
    const lastEditor = editors?.[editors.length - 1];

    if (!lastEditor) return;

    shouldScrollToNewQuestionRef.current = false;
    lastEditor.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [fields.length]);

  useEffect(() => {
    if (!pendingQuestionScrollRef.current) return;

    const firstFrame = requestAnimationFrame(() => {
      restoreQuestionPosition();
    });
    const secondFrame = requestAnimationFrame(() => {
      requestAnimationFrame(restoreQuestionPosition);
    });
    const interval = window.setInterval(restoreQuestionPosition, 50);
    const timeout = window.setTimeout(() => {
      restoreQuestionPosition();
      pendingQuestionScrollRef.current = null;
      window.clearInterval(interval);
    }, 800);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  });

  const filteredClasses = useMemo(() => {
    if (!watchSubjectId) {
      // No subject selected yet – hide all classes
      return [];
    }

    // Subject selected – show only classes with lessons for that subject
    const subjectId = Number(watchSubjectId);
    const validClassIds = new Set(
      teacherLessons
        .filter((l) => l.subjectId === subjectId)
        .map((l) => l.classId),
    );
    return classes.filter((c) => validClassIds.has(c.id));
  }, [classes, teacherLessons, watchSubjectId]);

  const watchEnableTimerResult = watchEnableTimer; // Just for reference

  const onSubmit = async (data: CreateExamWorkflowSchema) => {
    setIsSubmitting(true);
    try {
      const res =
        mode === "update" && examId
          ? await updateExamWorkflow(
              { success: true, error: false },
              examId,
              data,
            )
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
    <form
      ref={formRef}
      className="flex flex-col gap-6 [overflow-anchor:none]"
      onPointerDownCapture={(event) => rememberQuestionPosition(event.target)}
      onChangeCapture={(event) => rememberQuestionPosition(event.target)}
      onSubmit={handleSubmit(onSubmit)}
    >
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
            onClick={() => {
              shouldScrollToNewQuestionRef.current = true;
              append(
                {
                  type: "TEXT",
                  text: "",
                  points: 1,
                  order: fields.length + 1,
                  allowMultiple: false,
                  options: [],
                  correctAnswer: [],
                  textAnswer: "",
                },
                { shouldFocus: false },
              );
            }}
            className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md w-fit text-white transition-all"
          >
            + Add Question
          </button>
        </div>

        {fields.map((field, index) => {
          return (
            <QuestionEditor
              key={field.id}
              questionKey={field.id}
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


