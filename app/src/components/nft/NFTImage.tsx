import { useState } from "react";
import { ImageBroken } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NFTImageProps {
  src?: string;
  alt: string;
  className?: string;
  compact?: boolean;
}

export function NFTImage({ src, alt, className, compact = false }: NFTImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (image unavailable)`}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 bg-bg-muted text-fg-subtle",
          className,
        )}
      >
        <ImageBroken className={compact ? "size-4" : "size-8"} weight="bold" />
        {!compact && <span className="text-[11px] font-medium">Image unavailable</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("block h-full w-full object-cover", className)}
    />
  );
}
