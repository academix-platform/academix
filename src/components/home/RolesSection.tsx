"use client";
import { CheckCircle2, GraduationCap, ShieldCheck, Users } from "lucide-react";
import RevealSection from "./RevealSection";

const roles = [
  {
    title: "Administrator",
    description:
      "Manage teachers, classes, subjects, and school-wide operations from one dashboard.",
    icon: ShieldCheck,
    actions: [
      "Manage all users",
      "Configure school settings",
      "Generate reports",
      "Oversee operations",
    ],
  },
  {
    title: "Teacher",
    description:
      "Plan lessons, create assessments, track submissions, and monitor classroom progress.",
    icon: GraduationCap,
    actions: [
      "Create assessments",
      "Take attendance",
      "Grade submissions",
      "Manage class resources",
    ],
  },
  {
    title: "Student",
    description:
      "Access courses, complete assignments, track grades, and stay updated with announcements.",
    icon: Users,
    actions: [
      "View enrolled courses",
      "Submit assignments",
      "Track grades",
      "Review attendance",
    ],
  },
];

const RolesSection = () => {
  return (
    <RevealSection>
      <section id="roles" className="mx-auto px-6 py-20 max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-semibold text-3xl md:text-4xl tracking-tight">
            Designed for Every Role
          </h2>
          <p className="mt-4 text-slate-300">
            Tailored experiences for administrators, teachers, and students.
          </p>
        </div>
        <div className="gap-5 grid md:grid-cols-3 mt-14">
          {roles.map((role) => (
            <article
              key={role.title}
              className="bg-[#0e182c] p-6 border border-slate-800 rounded-xl"
            >
              <div className="inline-flex justify-center items-center bg-academixPurple/10 mb-4 rounded-lg w-12 h-12 text-academixPurpleDark">
                <role.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-2xl">{role.title}</h3>
              <p className="mt-3 text-slate-400 text-sm">{role.description}</p>
              <ul className="space-y-2 mt-5">
                {role.actions.map((action) => (
                  <li
                    key={action}
                    className="flex items-center gap-2 text-slate-200 text-sm"
                  >
                    <CheckCircle2 className="flex-shrink-0 w-4 h-4 text-academixPurpleDark" />
                    {action}
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
