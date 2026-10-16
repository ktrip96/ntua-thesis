import type { CSSProperties, ReactNode } from "react";
import { NFTCard } from "./NFTCard";
import { cn } from "@/lib/utils";
import type { MarketplaceNFT } from "@/types";

interface NFTGridProps {
  nfts: MarketplaceNFT[];
  variant?: "market" | "compact";
  isLoading?: boolean;
  currentAddress?: string;
  canBid?: boolean;
  onBid?: (nft: MarketplaceNFT) => void;
  onNFTClick?: (nft: MarketplaceNFT) => void;
  bidCounts?: Map<string, number>;
  escrowedIds?: Set<string>;
  empty: ReactNode;
}

function SkeletonCard({ compact }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white" aria-hidden>
      <div className="skeleton aspect-square" />
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <span className="skeleton h-3 w-[70%] rounded-full" />
        <span className="skeleton h-2.5 w-[45%] rounded-full" />
        {!compact && <span className="skeleton mt-1 h-[30px] w-full rounded-full" />}
      </div>
    </div>
  );
}

export function NFTGrid({
  nfts,
  variant = "market",
  isLoading = false,
  currentAddress,
  canBid = false,
  onBid,
  onNFTClick,
  bidCounts,
  escrowedIds,
  empty,
}: NFTGridProps) {
  const gridClass =
    variant === "compact"
      ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4"
      : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5";

  if (isLoading) {
    return (
      <div className={gridClass} aria-busy>
        {Array.from({ length: variant === "compact" ? 10 : 8 }).map((_, i) => (
          <SkeletonCard key={i} compact={variant === "compact"} />
        ))}
      </div>
    );
  }

  if (nfts.length === 0) return <>{empty}</>;

  return (
    <div className={cn(gridClass)}>
      {nfts.map((nft, i) => (
        <div key={nft.id} className="enter" style={{ "--i": Math.min(i, 14) } as CSSProperties}>
        <NFTCard
          nft={nft}
          variant={variant}
          currentAddress={currentAddress}
          canBid={canBid}
          onBid={onBid ? () => onBid(nft) : undefined}
          onClick={onNFTClick ? () => onNFTClick(nft) : undefined}
          bidCount={bidCounts?.get(nft.id) ?? 0}
          escrowed={escrowedIds?.has(nft.id) ?? false}
        />
        </div>
      ))}
    </div>
  );
}
