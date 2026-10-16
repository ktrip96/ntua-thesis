import { ArrowsLeftRight, Check, LockSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RarityPill, RarityDot } from "@/components/nft/Rarity";
import { NFTImage } from "@/components/nft/NFTImage";
import { AddressLink } from "@/components/ExplorerLink";
import { collectionMeta } from "@/config/catalog";
import { cn } from "@/lib/utils";
import type { MarketplaceNFT } from "@/types";

interface NFTCardProps {
  nft: MarketplaceNFT;
  variant?: "market" | "compact";
  currentAddress?: string;
  canBid?: boolean;
  onBid?: () => void;
  onClick?: () => void;
  bidCount?: number;
  escrowed?: boolean;
}

export function NFTCard({
  nft,
  variant = "market",
  currentAddress,
  canBid = false,
  onBid,
  onClick,
  bidCount = 0,
  escrowed = false,
}: NFTCardProps) {
  const isOwned = !!currentAddress && nft.owner === currentAddress;
  const collectionLabel = collectionMeta(nft.collection)?.label ?? nft.collection;
  const interactive = !!onClick;

  if (variant === "compact") {
    return (
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (interactive && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={cn(
          "surface rounded-[20px] p-1.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ube-500/40",
          interactive && "surface-hover cursor-pointer",
        )}
      >
        <div className="relative aspect-square overflow-hidden rounded-[14px] bg-bg-muted">
          <NFTImage src={nft.imageUrl} alt={nft.name} />
          {escrowed && <span className="absolute inset-0 bg-white/35" aria-hidden />}
          <RarityDot rarity={nft.rarity} className="absolute left-2 top-2" />
          {escrowed && (
            <Badge variant="dark" className="absolute right-2 top-2 px-2 py-0 text-[10.5px]">
              <LockSimple className="size-3" weight="bold" />
              In a bid
            </Badge>
          )}
          {bidCount > 0 && (
            <Badge variant="accent-solid" className="absolute right-2 top-2 px-2 py-0 text-[10.5px] font-bold">
              {bidCount} {bidCount === 1 ? "bid" : "bids"}
            </Badge>
          )}
        </div>
        <div className="px-2 pb-1.5 pt-2.5">
          <div className="truncate text-[13px] font-semibold">{nft.name || "Unnamed NFT"}</div>
          <div className="mt-px text-[11px] text-fg-subtle">{collectionLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "surface flex flex-col rounded-[20px] p-1.5",
        isOwned && "ring-2 ring-ube-300",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-[14px] bg-bg-muted">
        <NFTImage src={nft.imageUrl} alt={nft.name} />
        <RarityPill rarity={nft.rarity} className="absolute left-2.5 top-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-2.5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold">{nft.name || "Unnamed NFT"}</span>
          <span className="shrink-0 text-[11px] text-fg-subtle">{collectionLabel}</span>
        </div>
        <AddressLink address={nft.owner} objectId={nft.id} text={isOwned ? "you" : undefined} />
        <div className="mt-auto pt-0.5">
          {isOwned ? (
            <span className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-ube-100 text-[13px] font-semibold text-ube-700">
              <Check className="size-3.5" weight="bold" />
              You own this
            </span>
          ) : canBid ? (
            <Button className="w-full" onClick={onBid}>
              <ArrowsLeftRight weight="bold" />
              Place a bid
            </Button>
          ) : (
            <Button className="w-full" disabled>
              Connect to bid
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
