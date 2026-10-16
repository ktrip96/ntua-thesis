import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  meta?: ReactNode;
  description?: string;
  action?: ReactNode;
  above?: ReactNode;
  className?: string;
}

export function PageHeader({ title, meta, description, action, above, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {above}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]">{title}</h1>
          {meta && <span className="font-mono text-[12.5px] tabular-nums text-fg-muted">{meta}</span>}
        </div>
        {description && <p className="text-[14px] text-fg-muted sm:text-[14.5px]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
