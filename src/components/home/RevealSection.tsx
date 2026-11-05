"use client";

import { ReactNode } from "react";

interface RevealSectionProps {
  children: ReactNode;
  delay?: number;
}

const RevealSection = ({ children }: RevealSectionProps) => {
  return <>{children}</>;
};

export default RevealSection;
