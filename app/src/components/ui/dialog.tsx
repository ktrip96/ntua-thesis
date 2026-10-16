import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogVariant = "center" | "sheet" | "fullscreen";

const variantClasses: Record<DialogVariant, string> = {
  center:
    "left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
  sheet:
    "inset-x-0 bottom-0 w-full max-h-[92dvh] rounded-t-[20px] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[calc(100%-32px)] md:max-w-[640px] md:max-h-[85dvh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px] md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95",
  fullscreen:
    "inset-0 h-dvh w-screen rounded-none data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
};

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  variant?: DialogVariant;
}

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, variant = "center", ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden bg-white shadow-overlay outline-none duration-300 ease-out-soft data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-bold leading-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[12.5px] text-fg-muted", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

function SheetHandle() {
  return (
    <div className="flex justify-center pt-2.5 pb-0.5 md:hidden" aria-hidden>
      <span className="h-1 w-9 rounded-full bg-border-strong" />
    </div>
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
  SheetHandle,
};
