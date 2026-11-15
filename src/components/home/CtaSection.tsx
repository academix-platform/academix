"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import RevealSection from "./RevealSection";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const CtaSection = () => {
  const t = useTranslations("home.cta");

  return (
    <RevealSection>
      <section id="cta" className="relative mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 max-w-7xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-brandPurple-950 via-brandPurple-900 to-[#1c0d3f] p-8 sm:p-12 md:p-16 border border-brandPurple-800/80 rounded-3xl shadow-xl text-center text-white">
          {/* Subtle Accent Glow */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-brandPurple-500/10 blur-3xl pointer-events-none"
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full bg-white/10 border border-white/15 text-purple-100 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brandPurple-300" />
              <span>{t("badge")}</span>
            </div>

            <h2 className="text-display font-extrabold tracking-tight text-white leading-[1.2]">
              {t("title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-purple-100/90 text-base md:text-lg leading-relaxed">
              {t("description")}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 mt-9">
              <Link href="/school-signup">
                <Button
                  variant="inverted"
                  size="lg"
                  className="font-semibold shadow-md whitespace-nowrap"
                  rightIcon={<ArrowRight className="w-4 h-4 rtl:rotate-180 shrink-0" />}
                >
                  {t("button")}
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button
                  variant="glass"
                  size="lg"
                  className="font-semibold whitespace-nowrap"
                >
                  {t("signIn")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </RevealSection>
  );
};

export default CtaSection;
