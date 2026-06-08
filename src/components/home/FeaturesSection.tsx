"use client";

import {
  BarChart3,
  BookOpen,
  CalendarCheck2,
  ClipboardList,
  GraduationCap,
  Users,
} from "lucide-react";
import RevealSection from "./RevealSection";
import { useTranslations } from "next-intl";

const features = [
  {
    key: "students",
    icon: Users,
  },
  {
    key: "courses",
    icon: BookOpen,
  },
  {
    key: "assessments",
    icon: ClipboardList,
  },
  {
    key: "attendance",
    icon: CalendarCheck2,
  },
  {
    key: "reports",
    icon: BarChart3,
  },
  {
    key: "learning",
    icon: GraduationCap,
  },
];

const FeaturesSection = () => {
  const t = useTranslations("home.features");

  return (
    <RevealSection>
      <section
        id="features"
        className="bg-[var(--academix-ink)] border-purple-200/25 border-y"
      >
        <div className="mx-auto px-6 py-20 max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-semibold text-3xl md:text-4xl tracking-tight">
              {t("title")}
            </h2>
            <p className="mt-4 text-purple-50">
              {t("description")}
            </p>
          </div>
          <div className="gap-5 grid md:grid-cols-2 lg:grid-cols-3 mt-14">
            {features.map((feature) => (
              <article
                key={feature.key}
                className="bg-academixPurpleDeep/65 p-6 border border-purple-200/25 rounded-xl"
              >
                <div className="inline-flex justify-center items-center bg-academixPurple/10 mb-4 rounded-lg w-11 h-11 text-academixPurpleDark">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">
                  {t(`items.${feature.key}.title`)}
                </h3>
                <p className="mt-2 text-purple-100 text-sm">
                  {t(`items.${feature.key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RevealSection>
  );
};

export default FeaturesSection;
