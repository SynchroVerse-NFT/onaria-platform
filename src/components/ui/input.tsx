import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-text-primary placeholder:!text-gray-400 selection:bg-text-secondary selection:text-bg-3 flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-all duration-300 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-text-secondary focus-visible:ring-text-secondary/20 focus-visible:ring-[2px] focus-visible:shadow-sm focus-visible:scale-[1.01]",
        "hover:border-border-primary/70 hover:shadow-xs",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
