import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--cta)] text-white shadow-[0_0_24px_rgba(79,141,255,0.15)] hover:bg-[var(--cta-hover)] hover:shadow-[0_0_32px_rgba(79,141,255,0.25)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--aria-blue)] focus-visible:shadow-[0_0_12px_rgba(79,141,255,0.45)]",
        destructive:
          "bg-[var(--error)] text-white shadow-[0_0_24px_rgba(255,78,106,0.15)] hover:bg-[var(--error)]/90 hover:shadow-[0_0_32px_rgba(255,78,106,0.25)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--error)] focus-visible:shadow-[0_0_12px_rgba(255,78,106,0.45)]",
        outline:
          "border border-[var(--border-color)] bg-[var(--card)]/60 text-text-primary backdrop-blur-sm hover:border-[var(--aria-blue)]/50 hover:bg-[var(--card)]/80 hover:shadow-[0_0_16px_rgba(79,141,255,0.15)] focus-visible:ring-2 focus-visible:ring-[var(--aria-blue)]/50",
        secondary:
          "border border-[var(--border-color)] bg-[var(--card)] text-[var(--aria-blue)] hover:bg-[var(--card)]/80 hover:border-[var(--aria-blue)]/50 hover:shadow-[0_0_16px_rgba(79,141,255,0.1)] focus-visible:ring-2 focus-visible:ring-[var(--aria-blue)]/50",
        ghost:
          "hover:bg-[var(--card)]/60 hover:text-[var(--aria-blue)] text-text-primary backdrop-blur-sm",
        link: "text-[var(--aria-blue)] underline-offset-4 hover:underline hover:text-[var(--cta-hover)]",
      },
      size: {
        default: "h-11 px-5 py-3.5 has-[>svg]:px-4",
        sm: "h-9 rounded-xl gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-2xl px-6 has-[>svg]:px-5",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
