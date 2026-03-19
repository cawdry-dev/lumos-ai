import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base shadow-[inset_0_2px_4px_oklch(0_0_0/0.04)] backdrop-blur-sm ring-offset-background transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:transition-opacity placeholder:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:shadow-[inset_0_2px_4px_oklch(0_0_0/0.04),0_0_0_1px_oklch(0.6_0.15_264/0.15)] focus-visible:placeholder:opacity-60 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:shadow-[inset_0_2px_4px_oklch(0_0_0/0.15)] dark:focus-visible:shadow-[inset_0_2px_4px_oklch(0_0_0/0.15),0_0_0_1px_oklch(0.6_0.15_264/0.25)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
