import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-[var(--aria-blue)]/50 transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-[var(--aria-blue)]/30 bg-[var(--aria-blue)]/10 text-[var(--aria-blue)] shadow-[0_0_16px_rgba(79,141,255,0.1)] [a&]:hover:bg-[var(--aria-blue)]/20 [a&]:hover:shadow-[0_0_24px_rgba(79,141,255,0.2)]",
        secondary:
          "border-[var(--border-color)] bg-[var(--card)]/60 text-text-secondary backdrop-blur-sm [a&]:hover:bg-[var(--card)]/80 [a&]:hover:border-[var(--aria-blue)]/30",
        destructive:
          "border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)] shadow-[0_0_16px_rgba(255,78,106,0.1)] [a&]:hover:bg-[var(--error)]/20 [a&]:hover:shadow-[0_0_24px_rgba(255,78,106,0.2)]",
        success:
          "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)] shadow-[0_0_16px_rgba(38,208,124,0.1)] [a&]:hover:bg-[var(--success)]/20 [a&]:hover:shadow-[0_0_24px_rgba(38,208,124,0.2)]",
        outline:
          "border-[var(--border-color)] text-text-primary backdrop-blur-sm [a&]:hover:bg-[var(--card)]/60 [a&]:hover:border-[var(--aria-blue)]/50 [a&]:hover:text-[var(--aria-blue)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
