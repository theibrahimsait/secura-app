"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "relative flex flex-col  h-[100vh] items-center justify-center bg-zinc-50 dark:bg-zinc-900  text-slate-950 transition-bg",
          className
        )}
        {...props}
      >
        <div className="absolute left-0 top-0 w-1/2 h-full overflow-hidden lg:block hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secura-lime/30 via-secura-mint/40 to-secura-teal/30 animate-aurora opacity-70 blur-2xl"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-secura-moss/20 via-secura-lime/30 to-secura-mint/25 animate-aurora opacity-50 blur-3xl" style={{ animationDelay: '30s' }}></div>
        </div>
        {children}
      </div>
    </main>
  );
};