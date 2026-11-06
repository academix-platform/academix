"use client";

const steps = [
  {
    key: "account",
  },
  {
    key: "setup",
  },
  {
    key: "operations",
  },
  {
    key: "outcomes",
  },
];

import RevealSection from "./RevealSection";
import { useTranslations } from "next-intl";

const HowItWorksSection = () => {
  const t = useTranslations("home.howItWorks");

  return (
    <RevealSection>
      <section
        id="how-it-works"
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
          <div className="gap-8 grid sm:grid-cols-2 lg:grid-cols-4 mt-14">
            {steps.map((step, index) => (
              <article key={step.key} className="text-center">
                <div className="inline-flex justify-center items-center bg-white mb-4 rounded-full w-10 h-10 font-semibold text-academixPurpleDeep">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-lg">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="mt-2 text-purple-100 text-sm">
                  {t(`steps.${step.key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RevealSection>
  );
};

export default HowItWorksSection;
