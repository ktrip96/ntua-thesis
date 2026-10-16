import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-border-strong bg-white text-white transition-colors duration-300 ease-out-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ube-500/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-ube-500 data-[state=checked]:bg-ube-500",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="size-[13px]" weight="bold" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
