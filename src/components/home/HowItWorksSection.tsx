"use client";

const steps = [
  {
    title: "Create Account",
    description: "Sign up your school and invite your team in minutes.",
  },
  {
    title: "Set Up School",
    description: "Configure classes, subjects, roles, and academic terms.",
  },
  {
    title: "Run Operations",
    description:
      "Handle attendance, exams, communication, and daily workflows.",
  },
  {
    title: "Improve Outcomes",
    description: "Use reports and analytics to drive smarter decisions.",
  },
];

import RevealSection from "./RevealSection";

const HowItWorksSection = () => {
  return (
    <RevealSection>
      <section
        id="how-it-works"
        className="bg-slate-900/45 border-slate-800/80 border-y"
      >
        <div className="mx-auto px-6 py-20 max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-semibold text-3xl md:text-4xl tracking-tight">
              How It Works
            </h2>
            <p className="mt-4 text-slate-300">
              Launch your school workspace in a few guided steps.
            </p>
          </div>
          <div className="gap-8 grid sm:grid-cols-2 lg:grid-cols-4 mt-14">
            {steps.map((step, index) => (
              <article key={step.title} className="text-center">
                <div className="inline-flex justify-center items-center bg-academixPurpleDark/80 mb-4 rounded-full w-10 h-10 font-semibold text-slate-900">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="mt-2 text-slate-400 text-sm">
                  {step.description}
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
