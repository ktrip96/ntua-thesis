import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export function EmptyState({ icon, title, description, action, className, size = "md" }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-ube-200 bg-white/60 text-center",
        size === "md" ? "px-5 py-8" : "px-5 py-6",
        className,
      )}
    >
      {icon && (
        <span className="mb-1 inline-flex size-11 items-center justify-center rounded-full bg-ube-100 text-ube-600">
          {icon}
        </span>
      )}
      <div className={cn("font-bold", size === "md" ? "text-[15px]" : "text-sm")}>{title}</div>
      {description && (
        <div className={cn("text-fg-muted", size === "md" ? "text-[13px]" : "text-[12.5px]")}>
          {description}
        </div>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
