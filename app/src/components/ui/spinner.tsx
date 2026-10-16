import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-[13px] shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white",
        className,
      )}
    />
  );
}
