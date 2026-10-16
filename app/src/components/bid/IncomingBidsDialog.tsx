import { X } from "@phosphor-icons/react";
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
import { ExplorerLink } from "@/components/ExplorerLink";
import { OfferPill, SwapGlyph } from "@/components/bid/TradePills";
import { EmptyState } from "@/components/EmptyState";
import { offerSummary } from "@/lib/bidFields";
import { truncateAddress, cn } from "@/lib/utils";
import type { EnrichedBid } from "@/lib/bidEnriched";
import type { MarketplaceNFT } from "@/types";

interface IncomingBidsDialogProps {
  nft: MarketplaceNFT | null;
  bids: EnrichedBid[];
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (bid: EnrichedBid) => void;
  onReject: (bid: EnrichedBid) => void;
  pendingBidId?: string | null;
  pendingAction?: "accept" | "reject" | null;
}

export function IncomingBidsDialog({
  nft,
  bids,
  isLoading,
  open,
  onOpenChange,
  onAccept,
  onReject,
  pendingBidId = null,
  pendingAction = null,
}: IncomingBidsDialogProps) {
  const busy = pendingBidId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet" aria-describedby={undefined}>
        <SheetHandle />
        <div className="flex items-center gap-3.5 border-b border-border px-4 py-3.5 md:px-[22px] md:py-[18px]">
          <span className="size-[46px] shrink-0 overflow-hidden rounded-xl bg-bg-muted">
            <NFTImage src={nft?.imageUrl} alt={nft?.name ?? "NFT"} compact />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle>Incoming bids</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span className="truncate">for {nft?.name ?? "this NFT"}</span>
              {nft?.rarity && <RarityPill rarity={nft.rarity} size="xs" />}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="outline" size="icon-sm" className="hidden md:inline-flex" aria-label="Close">
              <X weight="bold" />
            </Button>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 py-4 md:px-[22px] md:py-[18px]">
          {isLoading ? (
            <>
              <div className="skeleton h-[118px] rounded-[14px]" />
              <div className="skeleton h-[118px] rounded-[14px]" />
            </>
          ) : bids.length === 0 ? (
            <EmptyState
              size="sm"
              title="No bids yet"
              description="When someone makes an offer on this NFT, it shows up here."
            />
          ) : (
            bids.map((entry) => {
              const isPending = pendingBidId === entry.bid.id;
              return (
                <div
                  key={entry.bid.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-[14px] border border-border p-3.5 md:px-4",
                    busy && !isPending && "opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2 text-[13px] text-fg-muted">
                    Bid from
                    <span className="font-mono text-xs text-fg">{truncateAddress(entry.bid.bidder)}</span>
                    <ExplorerLink id={entry.bid.bidder} entity="address" size="sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <OfferPill tone="ube" size="sm" nfts={entry.offeredNfts}>
                      You get {offerSummary(entry.offeredNfts.length, entry.bid.offeredSui)}
                    </OfferPill>
                    <SwapGlyph className="size-[15px]" />
                    <OfferPill tone="neutral" size="sm">
                      You give this NFT
                    </OfferPill>
                  </div>
                  <div className="flex gap-2.5">
                    <Button
                      className="h-11 flex-1 md:h-9"
                      onClick={() => onAccept(entry)}
                      loading={isPending && pendingAction === "accept"}
                      disabled={busy && !(isPending && pendingAction === "accept")}
                    >
                      {isPending && pendingAction === "accept" ? "Accepting…" : "Accept trade"}
                    </Button>
                    <Button
                      variant="danger"
                      className="h-11 px-[18px] md:h-9"
                      onClick={() => onReject(entry)}
                      loading={isPending && pendingAction === "reject"}
                      disabled={busy && !(isPending && pendingAction === "reject")}
                    >
                      {isPending && pendingAction === "reject" ? "Rejecting…" : "Reject"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
