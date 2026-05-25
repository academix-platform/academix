"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RevealSection from "./RevealSection";

const CtaSection = () => {
  return (
    <RevealSection>
      <section id="cta" className="mx-auto px-6 py-20 max-w-6xl">
        <div className="bg-[linear-gradient(135deg,rgba(2,6,23,0.95),rgba(124,58,237,0.15))] p-8 md:p-14 border border-slate-800 rounded-2xl text-center">
          <h2 className="font-semibold text-3xl md:text-5xl tracking-tight">
            Ready to Transform Your School?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Join Academix and simplify school operations with one platform for
            learning, assessment, and administration.
          </p>
          <div className="flex justify-center gap-4 mt-9">
            <Link
              href="/school-signup"
              className="group inline-flex justify-center items-center gap-2 bg-academixPurpleDark hover:bg-academixPurpleDark/90 hover:shadow-[0_12px_30px_rgba(124,58,237,0.35)] px-4 sm:px-7 py-2 sm:py-3 rounded-md font-medium text-white active:scale-[0.98] transition-all hover:-translate-y-0.5 duration-300"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-300" />
            </Link>
          </div>
        </div>
      </section>
    </RevealSection>
  );
};

export default CtaSection;
