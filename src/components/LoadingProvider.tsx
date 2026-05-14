"use client";

import { createContext, useContext, useTransition, ReactNode } from "react";
import Image from "next/image";

type LoadingContextType = {
  isPending: boolean;
  startTransition: (callback: () => void) => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransitionHook] = useTransition();

  return (
    <LoadingContext.Provider
      value={{
        isPending,
        startTransition: startTransitionHook,
      }}
    >
      {children}
      {isPending && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/10 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-5">
            <div className="bg-gradient-to-br from-[#C026D3] to-[#7C3AED] p-[4px] rounded-full">
              <div className="flex justify-center items-center bg-white rounded-full w-16 sm:w-24 h-16 sm:h-24">
                <img
                  src="/icon.png"
                  alt="Loading..."
                  className="w-10 sm:w-14 h-10 sm:h-14 animate-wiggle"
                  width={56}
                  height={56}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
}
