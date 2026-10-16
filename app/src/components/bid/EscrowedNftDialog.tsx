import { Link } from "react-router-dom";
import { LockSimple, X } from "@phosphor-icons/react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  SheetHandle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NFTImage } from "@/components/nft/NFTImage";
import { RarityPill } from "@/components/nft/Rarity";
import { SwapGlyph } from "@/components/bid/TradePills";
import { AssetPanel } from "@/components/bid/AssetRows";
import { truncateAddress } from "@/lib/utils";
import type { EnrichedBid } from "@/lib/bidEnriched";
import type { MarketplaceNFT } from "@/types";

interface EscrowedNftDialogProps {
  nft: MarketplaceNFT | null;
  entry: EnrichedBid | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (entry: EnrichedBid) => void;
  isCancelling: boolean;
}

export function EscrowedNftDialog({
  nft,
  entry,
  open,
  onOpenChange,
  onCancel,
  isCancelling,
}: EscrowedNftDialogProps) {
  const target = entry?.targetNft ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !isCancelling && onOpenChange(o)}>
      <DialogContent variant="sheet" aria-describedby={undefined}>
        <SheetHandle />
        <div className="flex items-center gap-3.5 border-b border-border px-4 py-3.5 md:px-[22px] md:py-[18px]">
          <span className="size-[46px] shrink-0 overflow-hidden rounded-xl bg-bg-muted">
            <NFTImage src={nft?.imageUrl} alt={nft?.name ?? "NFT"} compact />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="flex items-center gap-2">
              <LockSimple className="size-4 text-fg-muted" weight="bold" />
              Locked in your bid
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span className="truncate">{nft?.name ?? "This NFT"}</span>
              {nft?.rarity && <RarityPill rarity={nft.rarity} size="xs" />}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="outline" size="icon-sm" className="hidden md:inline-flex" aria-label="Close">
              <X weight="bold" />
            </Button>
          </DialogClose>
        </div>

        {entry && (
          <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 md:px-[22px] md:py-[18px]">
            <p className="text-[13px] leading-relaxed text-fg-muted">
              You offered this NFT in a bid on{" "}
              <span className="font-semibold text-fg">{target?.name ?? "an NFT"}</span>
              {target?.owner && (
                <>
                  {" "}
                  owned by <span className="font-mono text-xs">{truncateAddress(target.owner)}</span>
                </>
              )}
              . It stays in escrow until the owner accepts or rejects, or until you cancel.
            </p>

            <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-3.5">
              <AssetPanel label="You give" tone="neutral" nfts={entry.offeredNfts} mist={entry.bid.offeredSui} />
              <div className="flex justify-center md:self-center">
                <SwapGlyph framed className="-my-1 size-8 md:my-0 md:size-[38px]" />
              </div>
              <AssetPanel label="You get" tone="ube" nfts={target ? [target] : []} mist="0" />
            </div>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end [&>*]:h-11 [&>*]:sm:h-9">
              <Button asChild variant="outline" size="sm">
                <Link to="/my-bids">View in My bids</Link>
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => onCancel(entry)}
                loading={isCancelling}
              >
                {isCancelling ? "Cancelling…" : "Cancel bid"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
