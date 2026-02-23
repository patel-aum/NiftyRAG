"use client";

import { cn } from "@/lib/utils";

/** NiftyRAG logo: chart bars + wordmark. Use for header and favicon. */
export function NiftyRAGLogo({
  className,
  showWordmark = true,
  size = "md",
}: {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const iconSizes = { sm: 24, md: 32, lg: 40 };
  const iconSize = iconSizes[size];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect width="40" height="40" rx="8" fill="url(#logo-bg)" />
        <path
          d="M10 26V18h4v8h-4zm8-4v-6h4v6h-4zm8 2v-8h4v8h-4z"
          fill="url(#logo-bars)"
        />
        <path
          d="M10 18l2-4 2 2 2-3 2 2 2-4 2 3 2-2 2 4"
          stroke="url(#logo-line)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <defs>
          <linearGradient id="logo-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(142, 76%, 36%)" />
            <stop offset="1" stopColor="hsl(142, 70%, 28%)" />
          </linearGradient>
          <linearGradient id="logo-bars" x1="10" y1="14" x2="30" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(0, 0%, 100%)" stopOpacity="0.95" />
            <stop offset="1" stopColor="hsl(0, 0%, 100%)" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="logo-line" x1="10" y1="14" x2="30" y2="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(0, 0%, 100%)" />
            <stop offset="1" stopColor="hsl(0, 0%, 100%)" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark && (
        <span className={cn(
          "font-bold tracking-tight text-foreground",
          size === "sm" && "text-base",
          size === "md" && "text-xl",
          size === "lg" && "text-2xl"
        )}>
          Nifty<span className="text-primary">RAG</span>
        </span>
      )}
    </div>
  );
}
