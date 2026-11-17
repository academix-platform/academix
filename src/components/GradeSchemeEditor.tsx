"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { saveGradeScheme } from "@/lib/actions";
import {
  hasValidGradeComponentWeights,
  type GradeComponentKey,
} from "@/lib/gradeComponents";

export type ComponentOption = {
  key: GradeComponentKey | null;
  name: string;
  label: string;
};

type SchemeComponent = ComponentOption & { weight: number };

type Props = {
  teacherId: string;
  classId: number;
  subjectId: number;
  availableComponents: ComponentOption[];
  initialComponents: SchemeComponent[];
};

const componentToken = ({ key, name }: ComponentOption) =>
  key ?? `custom:${name.toLocaleLowerCase()}`;

export default function GradeSchemeEditor({
  teacherId,
  classId,
  subjectId,
  availableComponents,
  initialComponents,
}: Props) {
  const t = useTranslations("gradeComponents");
  const router = useRouter();
  const [components, setComponents] =
    useState<SchemeComponent[]>(initialComponents);
  const [selection, setSelection] = useState("");
  const [customName, setCustomName] = useState("");
  const [isSubmitting, startTransition] = useTransition();
  const weightTotal = components.reduce(
    (total, component) => total + (Number(component.weight) || 0),
    0,
  );
  const selectedTokens = new Set(components.map(componentToken));
  const addableComponents = availableComponents.filter(
    (component) => !selectedTokens.has(componentToken(component)),
  );

  const addComponent = (component: ComponentOption) => {
    setComponents((current) => [
      ...current,
      { ...component, weight: 0 },
    ]);
  };

  const addCustomComponent = () => {
    const name = customName.trim();
    if (!name) return;
    if (
      components.some(
        (component) =>
          component.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      toast.error(t("duplicateComponent"));
      return;
    }

    addComponent({ key: null, name, label: name });
    setCustomName("");
  };

  const save = () => {
    if (!hasValidGradeComponentWeights(components)) {
      toast.error(t("weightsMustTotal100"));
      return;
    }

    startTransition(async () => {
      const result = await saveGradeScheme(
        { success: false, error: false },
        {
          teacherId,
          classId,
          subjectId,
          components: components.map(({ key, name, weight }) => ({
            key,
            name,
            weight: Number(weight),
          })),
        },
      );

      if (!result.success) {
        toast.error(result.message ?? t("saveFailed"));
        return;
      }

      toast.success(t("saved"));
      router.refresh();
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
          {t("schemeTitle")}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t("schemeDescription")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <select
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">{t("chooseComponent")}</option>
          {addableComponents.map((component) => (
            <option
              key={componentToken(component)}
              value={componentToken(component)}
            >
              {component.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selection}
          onClick={() => {
            const component = addableComponents.find(
              (option) => componentToken(option) === selection,
            );
            if (component) addComponent(component);
            setSelection("");
          }}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:bg-slate-800"
        >
          {t("addComponent")}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          maxLength={60}
          placeholder={t("customPlaceholder")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="button"
          onClick={addCustomComponent}
          disabled={!customName.trim()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
        >
          {t("addCustom")}
        </button>
      </div>

      {components.length > 0 ? (
        <div className="space-y-2">
          {components.map((component, index) => (
            <div
              key={componentToken(component)}
              className="grid items-center gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_150px_auto] dark:bg-slate-950/60"
            >
              <span className="text-sm font-medium">{component.label}</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  value={component.weight || ""}
                  onChange={(event) => {
                    const weight = Number(event.target.value);
                    setComponents((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, weight } : item,
                      ),
                    );
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                />
                <span>%</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setComponents((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="text-sm font-medium text-rose-600 hover:text-rose-700"
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          {t("emptyScheme")}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p
          className={
            Math.abs(weightTotal - 100) < 0.01
              ? "text-sm font-semibold text-emerald-700"
              : "text-sm font-semibold text-rose-600"
          }
        >
          {t("totalWeight", { total: weightTotal.toFixed(2) })}
        </p>
        <button
          type="button"
          disabled={isSubmitting || !hasValidGradeComponentWeights(components)}
          onClick={save}
          className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? t("saving") : t("save")}
        </button>
      </div>
    </section>
  );
}
