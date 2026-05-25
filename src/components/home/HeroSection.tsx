"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import AnimatedTitle from "./AnimatedTitle";

const HeroSection = () => {
  return (
    <section
      id="hero"
      className="relative pt-16 border-slate-800/60 border-b overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.15),_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" />
      <div className="z-10 relative mx-auto px-6 py-20 md:py-24 max-w-6xl text-center">
        <div className="inline-flex items-center gap-2 bg-slate-900/80 mb-6 px-4 py-2 border border-slate-700 rounded-full text-slate-200 text-sm">
          <Sparkles className="w-4 h-4 text-academixPurpleDark" />
          School Management Platform
        </div>
        <AnimatedTitle
          className="mx-auto max-w-3xl font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight"
          highlightWord="Academix"
          highlightColor="text-amber-400"
        >
          Welcome to Academix
        </AnimatedTitle>
        <p className="mx-auto mt-6 max-w-2xl text-slate-300 md:text-[16px] text-sm lg:text-lg">
          A modern school management platform designed to streamline academic
          workflows for administrators, teachers, students, and parents.
        </p>
        <div className="flex justify-center gap-4 mt-10">
          <Link
            href="/sign-in"
            className="inline-flex justify-center items-center gap-2 bg-gradient-to-br from-[#7C3AED] hover:from-[#6D28D9] to-[#A78BFA] hover:to-[#8B5CF6] hover:shadow-[0_8px_30px_rgba(124,58,237,0.35)] px-4 sm:px-7 py-2 sm:py-3 rounded-md font-medium text-white hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/school-signup"
            className="inline-flex justify-center items-center hover:bg-academixPurpleDark/10 hover:shadow-[0_8px_25px_rgba(124,58,237,0.12)] px-4 sm:px-7 py-2 sm:py-3 border border-slate-700 hover:border-academixPurpleDark/40 rounded-md font-medium text-white hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
