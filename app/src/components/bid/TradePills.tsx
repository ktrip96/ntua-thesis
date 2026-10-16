import type { ReactNode } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { NFTImage } from "@/components/nft/NFTImage";
import { cn } from "@/lib/utils";
import type { MarketplaceNFT } from "@/types";

export function AvatarStack({
  nfts,
  size = 24,
  className,
}: {
  nfts: MarketplaceNFT[];
  size?: number;
  className?: string;
}) {
  const shown = nfts.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <span className={cn("inline-flex items-center", className)}>
      {shown.map((nft, i) => (
        <span
          key={nft.id}
          style={{ width: size, height: size, marginLeft: i === 0 ? 0 : -Math.round(size * 0.55) }}
          className="inline-block overflow-hidden rounded-[7px] border-[1.5px] border-white bg-bg-muted"
        >
          <NFTImage src={nft.imageUrl} alt={nft.name} compact />
        </span>
      ))}
    </span>
  );
}

type Tone = "ube" | "dragonfruit" | "neutral";

const toneClass: Record<Tone, string> = {
  ube: "bg-ube-100 text-ube-800",
  dragonfruit: "bg-dragonfruit-100 text-dragonfruit-800",
  neutral: "bg-bg-muted text-fg-muted",
};

export function OfferPill({
  tone = "ube",
  nfts,
  children,
  className,
  size = "md",
}: {
  tone?: Tone;
  nfts?: MarketplaceNFT[];
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-semibold",
        size === "md" ? "px-3.5 py-2 text-[13px]" : "px-3 py-[7px] text-[12.5px]",
        toneClass[tone],
        className,
      )}
    >
      {nfts && nfts.length > 0 && <AvatarStack nfts={nfts} size={size === "md" ? 26 : 24} />}
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}

export function SwapGlyph({
  framed = false,
  className,
}: {
  framed?: boolean;
  className?: string;
}) {
  if (framed) {
    return (
      <span
        className={cn(
          "inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-white text-ube-600 shadow-surface ring-1 ring-ube-900/[0.06]",
          className,
        )}
        aria-label="in exchange for"
      >
        <ArrowsLeftRight className="size-4" weight="bold" />
      </span>
    );
  }
  return (
    <ArrowsLeftRight
      className={cn("size-4 shrink-0 text-fg-subtle", className)} weight="bold"
      aria-label="in exchange for"
    />
  );
}

export function SuiMark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] bg-blueberry-100",
        className,
      )}
      aria-hidden
    >
      <img src="/sui.svg" alt="" width={Math.round(size * 0.46)} height={Math.round(size * 0.46)} />
    </span>
  );
}
