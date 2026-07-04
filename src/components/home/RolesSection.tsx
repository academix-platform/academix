"use client";
import { CheckCircle2, GraduationCap, ShieldCheck, Users } from "lucide-react";
import RevealSection from "./RevealSection";
import { useTranslations } from "next-intl";

const roles = [
  {
    key: "administrator",
    icon: ShieldCheck,
    actions: ["users", "settings", "reports", "operations"],
  },
  {
    key: "teacher",
    icon: GraduationCap,
    actions: ["assessments", "attendance", "grading", "resources"],
  },
  {
    key: "student",
    icon: Users,
    actions: ["courses", "assignments", "grades", "attendance"],
  },
];

const RolesSection = () => {
  const t = useTranslations("home.roles");

  return (
    <RevealSection>
      <section id="roles" className="mx-auto px-6 py-20 max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-semibold text-3xl md:text-4xl tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-4 text-purple-50">{t("description")}</p>
        </div>
        <div className="gap-5 grid md:grid-cols-3 mt-14">
          {roles.map((role) => (
            <article
              key={role.key}
              className="bg-academixPurpleDeep/65 p-6 border border-purple-200/25 rounded-xl"
            >
              <div className="inline-flex justify-center items-center bg-academixPurple/10 mb-4 rounded-lg w-12 h-12 text-academixPurpleDark">
                <role.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-2xl">
                {t(`items.${role.key}.title`)}
              </h3>
              <p className="mt-3 text-purple-100 text-sm">
                {t(`items.${role.key}.description`)}
              </p>
              <ul className="space-y-2 mt-5">
                {role.actions.map((action) => (
                  <li
                    key={action}
                    className="flex items-center gap-2 text-purple-100 text-sm"
                  >
                    <CheckCircle2 className="flex-shrink-0 w-4 h-4 text-green-500" />
                    {t(`items.${role.key}.actions.${action}`)}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </RevealSection>
  );
};

export default RolesSection;
