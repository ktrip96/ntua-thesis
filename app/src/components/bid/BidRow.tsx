import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { NFTImage } from "@/components/nft/NFTImage";
import { SwapGlyph } from "@/components/bid/TradePills";
import { AssetPanel } from "@/components/bid/AssetRows";
import { offerSummary } from "@/lib/bidFields";
import { truncateAddress, cn } from "@/lib/utils";
import type { EnrichedBid } from "@/lib/bidEnriched";

export type BidAction = "accept" | "reject" | "cancel";

interface BidRowProps {
  entry: EnrichedBid;
  direction: "placed" | "received";
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  pending?: BidAction | null;
  disabled?: boolean;
}

export function BidRow({
  entry,
  direction,
  onAccept,
  onReject,
  onCancel,
  pending = null,
  disabled = false,
}: BidRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { bid, targetNft, offeredNfts } = entry;

  const received = direction === "received";
  const giveNfts = received ? (targetNft ? [targetNft] : []) : offeredNfts;
  const giveMist = received ? "0" : bid.offeredSui;
  const getNfts = received ? offeredNfts : targetNft ? [targetNft] : [];
  const getMist = received ? bid.offeredSui : "0";
  const giveSummary = offerSummary(giveNfts.length, giveMist);
  const getSummary = offerSummary(getNfts.length, getMist);
  const counterparty = received ? bid.bidder : targetNft?.owner;
  const busy = pending !== null;

  const actions = received ? (
    <>
      <Button
        size="sm"
        onClick={onAccept}
        loading={pending === "accept"}
        disabled={disabled || (busy && pending !== "accept") || !onAccept}
      >
        {pending === "accept" ? "Accepting…" : expanded ? "Accept trade" : "Accept"}
      </Button>
      <Button
        size="sm"
        variant="danger"
        onClick={onReject}
        loading={pending === "reject"}
        disabled={disabled || (busy && pending !== "reject") || !onReject}
      >
        {pending === "reject" ? "Rejecting…" : "Reject"}
      </Button>
    </>
  ) : (
    <Button
      size="sm"
      variant="danger"
      onClick={onCancel}
      loading={pending === "cancel"}
      disabled={disabled || !onCancel}
    >
      {pending === "cancel" ? "Cancelling…" : "Cancel bid"}
    </Button>
  );

  return (
    <div
      className={cn(
        "surface overflow-hidden rounded-[20px] transition-[opacity,box-shadow] duration-500 ease-out-soft",
        expanded && "ring-2 ring-ube-300",
        disabled && !busy && "opacity-60",
      )}
    >
      {/* A div with button role, so the action buttons are not nested in a <button>. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="flex cursor-pointer items-center gap-3 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ube-500/40 sm:gap-4 sm:px-5"
      >
        <span className="size-11 shrink-0 overflow-hidden rounded-[11px] bg-bg-muted">
          <NFTImage src={targetNft?.imageUrl} alt={targetNft?.name ?? "NFT"} compact />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {received ? (
              <>
                Bid from <span className="font-mono text-[12.5px] font-medium">{truncateAddress(bid.bidder)}</span>
              </>
            ) : (
              <>Bid on {targetNft?.name ?? "Unknown NFT"}</>
            )}
          </div>
          <div className="truncate text-[12.5px] text-fg-muted">
            <span className="hidden sm:inline">
              {received ? (
                <>targeting {targetNft?.name ?? "your NFT"}</>
              ) : (
                <>
                  to{" "}
                  <span className="font-mono text-[11.5px]">
                    {counterparty ? truncateAddress(counterparty) : "unknown"}
                  </span>
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 sm:hidden">
              {giveSummary}
              <SwapGlyph className="size-3" />
              {getSummary}
            </span>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 font-mono text-xs text-fg-muted sm:inline-flex">
          {giveSummary}
          <SwapGlyph className="size-[13px]" />
          {getSummary}
        </span>
        {!expanded && (
          <div className="hidden items-center gap-2 md:flex" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
        <span className="text-fg-subtle" aria-hidden>
          {expanded ? <CaretUp className="size-[15px]" weight="bold" /> : <CaretDown className="size-[15px]" weight="bold" />}
        </span>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3.5 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
          <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-3.5">
            <AssetPanel label="You give" tone="neutral" nfts={giveNfts} mist={giveMist} />
            <div className="flex justify-center md:self-center">
              <SwapGlyph framed className="-my-1 size-8 md:my-0 md:size-[38px]" />
            </div>
            <AssetPanel label="You get" tone="ube" nfts={getNfts} mist={getMist} />
          </div>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end [&>button]:h-11 [&>button]:sm:h-9">
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}
