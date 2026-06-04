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

const features = [
  {
    title: "Student Management",
    description:
      "Keep student profiles, enrollment history, and academic records organized in one place.",
    icon: Users,
  },
  {
    title: "Course Management",
    description:
      "Plan subjects, assign teachers, and structure class schedules for every grade level.",
    icon: BookOpen,
  },
  {
    title: "Assessments",
    description:
      "Create assignments and exams, then monitor submissions and grading progress.",
    icon: ClipboardList,
  },
  {
    title: "Attendance Tracking",
    description:
      "Digitize daily attendance with automated summaries and actionable reports.",
    icon: CalendarCheck2,
  },
  {
    title: "Grades & Reports",
    description:
      "Generate report cards and analytics to support better academic decisions.",
    icon: BarChart3,
  },
  {
    title: "Virtual Learning Space",
    description:
      "Share resources, announcements, and course content in a unified student experience.",
    icon: GraduationCap,
  },
];

const FeaturesSection = () => {
  return (
    <RevealSection>
      <section
        id="features"
        className="bg-[var(--academix-ink)] border-purple-200/25 border-y"
      >
        <div className="mx-auto px-6 py-20 max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-semibold text-3xl md:text-4xl tracking-tight">
              Key Features
            </h2>
            <p className="mt-4 text-purple-50">
              Everything your institution needs to run smarter every day.
            </p>
          </div>
          <div className="gap-5 grid md:grid-cols-2 lg:grid-cols-3 mt-14">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="bg-academixPurpleDeep/65 p-6 border border-purple-200/25 rounded-xl"
              >
                <div className="inline-flex justify-center items-center bg-academixPurple/10 mb-4 rounded-lg w-11 h-11 text-academixPurpleDark">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="mt-2 text-purple-100 text-sm">
                  {feature.description}
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
