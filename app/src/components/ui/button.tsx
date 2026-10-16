import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ube-500/40 active:scale-[0.98] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-ube-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(64,35,137,0.2)] hover:bg-ube-600 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_rgba(137,95,250,0.35)] disabled:bg-neutral-100 disabled:text-neutral-400 disabled:shadow-none",
        soft: "bg-ube-100 text-ube-700 hover:bg-ube-200",
        outline:
          "bg-white text-fg shadow-field ring-1 ring-ube-900/[0.08] hover:bg-bg-subtle hover:ring-ube-900/[0.14] disabled:text-neutral-400",
        "outline-primary":
          "border border-ube-300 bg-white text-ube-700 hover:bg-ube-100",
        danger:
          "bg-white text-danger shadow-field ring-1 ring-ube-900/[0.08] hover:bg-danger-soft hover:ring-danger/30 disabled:text-neutral-400",
        ghost: "text-fg-muted hover:bg-bg-muted hover:text-fg",
        dark: "bg-neutral-900 text-white hover:bg-neutral-800",
        link: "text-link underline-offset-4 hover:underline font-semibold",
      },
      size: {
        sm: "h-8 px-4 text-[13px] [&_svg]:size-3.5",
        default: "h-9 px-5 text-[13.5px] [&_svg]:size-4",
        lg: "h-11 px-6 text-sm [&_svg]:size-4",
        xl: "h-12 px-7 text-[15px] [&_svg]:size-4",
        icon: "h-9 w-9 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && variant !== "outline" && variant !== "danger" && "bg-ube-400 hover:bg-ube-400 text-white pointer-events-none",
          loading && (variant === "outline" || variant === "danger") && "pointer-events-none opacity-70",
        )}
        ref={ref}
        disabled={disabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && !asChild ? (
          <>
            <Spinner />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
