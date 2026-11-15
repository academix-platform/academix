import {
  BarChart3,
  Globe2,
  Shield,
  Layers,
  CheckCircle2,
  Users2,
  GraduationCap,
  FileSpreadsheet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

const highlights = [
  {
    key: "multilingual",
    icon: Globe2,
  },
  {
    key: "roleAccess",
    icon: Shield,
  },
  {
    key: "insights",
    icon: BarChart3,
  },
];

const AboutSection = async () => {
  const t = await getTranslations("home.about");

  return (
    <section id="about" className="relative mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 max-w-7xl">
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Narrative Column */}
        <div className="lg:col-span-7 space-y-6 text-start">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brandPurple-50 border border-brandPurple-200 text-brandPurple-800 text-xs font-semibold tracking-wider uppercase shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-brandPurple-600" />
            <span>{t("badge")}</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-display font-extrabold tracking-tight text-content-primary leading-[1.18]">
              {t("title")}
            </h2>
            <p className="text-content-secondary text-base sm:text-lg leading-relaxed max-w-2xl">
              {t("description")}
            </p>
          </div>

          {/* 3 Structured Pillars */}
          <div className="space-y-4 pt-4 border-t border-outline">
            {highlights.map((item) => (
              <div
                key={item.key}
                className="group flex items-start gap-4 p-3.5 rounded-xl border border-transparent hover:border-outline hover:bg-surface-muted/60 transition-all duration-200"
              >
                <div className="inline-flex justify-center items-center bg-brandPurple-50 border border-brandPurple-200/80 rounded-xl w-11 h-11 text-brandPurple-600 shrink-0 mt-0.5 group-hover:bg-brandPurple-600 group-hover:text-white transition-colors duration-200 shadow-2xs">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-content-primary">
                    {t(`highlights.${item.key}.title`)}
                  </h3>
                  <p className="text-content-secondary text-sm leading-relaxed">
                    {t(`highlights.${item.key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Architecture Showcase Card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-2xl md:rounded-3xl border border-outline bg-surface p-6 sm:p-8 shadow-xl space-y-6 text-start ring-1 ring-black/5">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-outline">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-brandPurple-700 uppercase tracking-wider">
                  {t("badge")}
                </span>
                <h4 className="font-bold text-lg text-content-primary">
                  {t("previewTitle")}
                </h4>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            </div>

            <p className="text-content-secondary text-xs sm:text-sm leading-relaxed">
              {t("previewSubtitle")}
            </p>

            {/* Structured Capabilities List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-canvas-subtle border border-outline/70">
                <Globe2 className="w-4 h-4 text-brandPurple-600 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-content-primary">
                  {t("previewPill1")}
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-canvas-subtle border border-outline/70">
                <Users2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-content-primary">
                  {t("previewPill2")}
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-canvas-subtle border border-outline/70">
                <GraduationCap className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-content-primary">
                  {t("previewPill3")}
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-canvas-subtle border border-outline/70">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-content-primary">
                  {t("previewPill4")}
                </span>
              </div>
            </div>

            {/* Bottom Proof Row */}
            <div className="pt-4 border-t border-outline flex items-center justify-between text-xs text-content-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Academix Core Platform</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-content-secondary">
                v2.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
