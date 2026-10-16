import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-ube-100 text-ube-700",
        accent: "bg-dragonfruit-100 text-dragonfruit-700",
        "accent-solid": "bg-dragonfruit-500 text-white shadow-[0_1px_4px_rgba(235,20,120,.4)]",
        info: "bg-blueberry-100 text-blueberry-700",
        neutral: "bg-bg-muted text-fg-muted",
        dark: "bg-neutral-900/70 text-white font-mono font-normal",
        outline: "border border-border text-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
