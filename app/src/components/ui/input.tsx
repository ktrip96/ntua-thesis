import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-border bg-white px-4 text-[15px] text-fg shadow-field transition-[border-color,box-shadow] duration-300 ease-out-soft placeholder:text-fg-subtle focus-visible:border-ube-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ube-500/30 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
