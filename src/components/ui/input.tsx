import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-text-primary placeholder:!text-[var(--muted)] selection:bg-[var(--aria-blue)]/20 selection:text-text-primary flex h-11 w-full min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--card)]/60 backdrop-blur-sm px-4 py-3 text-base transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-text-primary",
        "focus-visible:border-[var(--aria-blue)] focus-visible:shadow-[0_0_0_1px_var(--aria-blue),0_0_12px_rgba(79,141,255,0.45)] focus-visible:bg-[var(--card)]/80",
        "hover:border-[var(--aria-blue)]/50 hover:bg-[var(--card)]/80",
        "aria-invalid:border-[var(--error)] aria-invalid:shadow-[0_0_0_1px_var(--error),0_0_12px_rgba(255,78,106,0.45)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
