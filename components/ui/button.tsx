import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        danger: "",
        info: "",
        purple: "",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Color variants with inline styles (Tailwind CSS 4 compatible)
const colorStyles: Record<string, React.CSSProperties> = {
  danger: { backgroundColor: '#dc2626', color: 'white' },
  info: { backgroundColor: '#2563eb', color: 'white' },
  purple: { backgroundColor: '#9333ea', color: 'white' },
}

const hoverStyles: Record<string, string> = {
  danger: '#b91c1c',
  info: '#1d4ed8',
  purple: '#7e22ce',
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  const isColorVariant = variant && ['danger', 'info', 'purple'].includes(variant)

  const [isHovered, setIsHovered] = React.useState(false)

  const inlineStyle: React.CSSProperties = isColorVariant
    ? {
        ...colorStyles[variant],
        backgroundColor: isHovered ? hoverStyles[variant] : colorStyles[variant].backgroundColor,
        ...style,
      }
    : style || {}

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      style={inlineStyle}
      onMouseEnter={(e) => {
        setIsHovered(true)
        props.onMouseEnter?.(e as React.MouseEvent<HTMLButtonElement>)
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        props.onMouseLeave?.(e as React.MouseEvent<HTMLButtonElement>)
      }}
      {...props}
    />
  )
}

export { Button, buttonVariants }
