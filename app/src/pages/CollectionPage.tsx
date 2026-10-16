import { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Info, Plus } from "@phosphor-icons/react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { NFTGrid } from "@/components/nft/NFTGrid";
import { RarityFilter, useRarityFilter } from "@/components/nft/RarityFilter";
import { rarityTier } from "@/components/nft/Rarity";
import { PlaceBidDialog } from "@/components/bid/PlaceBidDialog";
import { useMarketplaceNFTs } from "@/hooks/useMarketplaceNFTs";
import { COLLECTIONS, RARITY_ORDER, type Collection } from "@/config/catalog";
import type { MarketplaceNFT } from "@/types";

const isValidCollection = (id: string | undefined): id is Collection =>
  COLLECTIONS.some((c) => c.id === id);

export function CollectionPage() {
  const account = useCurrentAccount();
  const { collection } = useParams<{ collection: string }>();
  const { data: nfts, isLoading } = useMarketplaceNFTs();
  const [bidTarget, setBidTarget] = useState<MarketplaceNFT | null>(null);
  const rarity = useRarityFilter();

  if (!isValidCollection(collection)) {
    return <Navigate to="/" replace />;
  }

  const meta = COLLECTIONS.find((c) => c.id === collection)!;
  const inCollection = (nfts ?? []).filter((nft) => nft.collection === collection);
  const filtered = inCollection.filter((nft) => rarity.matches(rarityTier(nft.rarity)));
  const counts = Object.fromEntries(
    RARITY_ORDER.map((tier) => [tier, inCollection.filter((nft) => rarityTier(nft.rarity) === tier).length]),
  ) as Record<(typeof RARITY_ORDER)[number], number>;
  const lowerLabel = meta.label.toLowerCase();
  const isFiltered = rarity.selected.length > 0;

  return (
    <div>
      <PageHeader
        above={
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="size-[13px]" weight="bold" />
            Marketplace
          </Link>
        }
        title={meta.label}
        meta={isLoading ? "…" : isFiltered ? `${filtered.length} of ${inCollection.length} on the table` : `${inCollection.length} on the table`}
        action={
          <Button asChild size="lg">
            <Link to="/mint">
              <Plus weight="bold" />
              Mint a {meta.singular}
            </Link>
          </Button>
        }
      />

      <RarityFilter
        className="mb-4"
        selected={rarity.selected}
        counts={counts}
        onToggle={rarity.toggle}
        onClear={rarity.clear}
      />

      {!account && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-blueberry-100 px-3.5 py-[11px] text-[12.5px] font-medium leading-snug text-blueberry-700 sm:text-[13px]">
          <Info className="size-[15px] shrink-0" weight="bold" />
          Connect your wallet to place bids.
        </div>
      )}

      <NFTGrid
        nfts={filtered}
        variant="market"
        isLoading={isLoading}
        currentAddress={account?.address}
        canBid={!!account}
        onBid={setBidTarget}
        empty={
          isFiltered ? (
            <EmptyState
              size="sm"
              title={`No ${rarity.selected.join(" or ")} ${lowerLabel} on the table`}
              description="Try another rarity, or mint one yourself."
              action={
                <Button variant="outline-primary" size="sm" onClick={rarity.clear}>
                  Show all rarities
                </Button>
              }
            />
          ) : (
            <EmptyState
              size="sm"
              title={`No ${lowerLabel} minted yet`}
              description="Be the first. Minting is free."
              action={
                <Button asChild variant="outline-primary" size="sm">
                  <Link to="/mint">Mint a {meta.singular}</Link>
                </Button>
              }
            />
          )
        }
      />

      <PlaceBidDialog
        targetNft={bidTarget}
        open={!!bidTarget}
        onOpenChange={(open) => {
          if (!open) setBidTarget(null);
        }}
      />
    </div>
  );
}
