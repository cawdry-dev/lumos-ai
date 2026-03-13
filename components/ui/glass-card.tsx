import * as React from "react";
import { cn } from "@/lib/utils";

const glassVariants = {
  default: "glass",
  strong: "glass-strong",
  subtle: "glass-subtle",
} as const;

type GlassCardVariant = keyof typeof glassVariants;

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassCardVariant;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        glassVariants[variant],
        "rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",
        className,
      )}
      {...props}
    />
  ),
);
GlassCard.displayName = "GlassCard";

export { GlassCard, type GlassCardVariant };

