import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { WalletGate } from "@/components/WalletGate";
import { EmptyState } from "@/components/EmptyState";
import { NFTGrid } from "@/components/nft/NFTGrid";
import { IncomingBidsDialog } from "@/components/bid/IncomingBidsDialog";
import { EscrowedNftDialog } from "@/components/bid/EscrowedNftDialog";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import { useReceivedBids } from "@/hooks/useReceivedBids";
import { useMyBids } from "@/hooks/useMyBids";
import { useAcceptBid } from "@/hooks/useAcceptBid";
import { useRejectBid } from "@/hooks/useRejectBid";
import { useCancelBid } from "@/hooks/useCancelBid";
import { receivedSummary, type EnrichedBid } from "@/lib/bidEnriched";
import type { MarketplaceNFT } from "@/types";

export function MyNFTsPage() {
  const account = useCurrentAccount();
  const address = account?.address;
  const { data: nfts, isLoading } = useOwnedNFTs(address);
  const { data: received, isLoading: bidsLoading } = useReceivedBids(address);
  const { data: placed } = useMyBids(address);
  const { acceptBid, isPending: isAccepting } = useAcceptBid();
  const { rejectBid, isPending: isRejecting } = useRejectBid();
  const { cancelBid, isPending: isCancelling } = useCancelBid();

  const [selectedNft, setSelectedNft] = useState<MarketplaceNFT | null>(null);
  const [pending, setPending] = useState<{ id: string; action: "accept" | "reject" } | null>(null);

  useEffect(() => {
    if (!isAccepting && !isRejecting) setPending(null);
  }, [isAccepting, isRejecting]);

  // Escrowed NFTs belong to the Bid object, so they are missing from `nfts`;
  // anything already back in the wallet wins over a stale bid list.
  const escrow = useMemo(() => {
    const ownedIds = new Set((nfts ?? []).map((n) => n.id));
    const byNftId = new Map<string, EnrichedBid>();
    const escrowed: MarketplaceNFT[] = [];
    for (const entry of placed ?? []) {
      for (const nft of entry.offeredNfts) {
        if (ownedIds.has(nft.id) || byNftId.has(nft.id)) continue;
        byNftId.set(nft.id, entry);
        escrowed.push(nft);
      }
    }
    return { byNftId, nfts: escrowed };
  }, [placed, nfts]);

  const allNfts = useMemo(() => [...(nfts ?? []), ...escrow.nfts], [nfts, escrow.nfts]);
  const escrowedIds = useMemo(() => new Set(escrow.byNftId.keys()), [escrow.byNftId]);
  const selectedEscrowEntry = selectedNft ? escrow.byNftId.get(selectedNft.id) ?? null : null;

  const bidCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of received ?? []) {
      const id = entry.targetNft?.id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [received]);

  const bidsForSelected = useMemo(
    () => (received ?? []).filter((e) => e.targetNft?.id === selectedNft?.id),
    [received, selectedNft?.id],
  );

  if (!account) {
    return <WalletGate title="Your NFTs live here" description="Connect your wallet to see what you own." />;
  }

  const handleAccept = (entry: EnrichedBid) => {
    if (!selectedNft) return;
    setPending({ id: entry.bid.id, action: "accept" });
    acceptBid(entry.bid.id, [selectedNft.id], {
      description: receivedSummary(entry),
      onSuccess: () => setSelectedNft(null),
    });
  };

  const handleReject = (entry: EnrichedBid) => {
    if (!selectedNft) return;
    setPending({ id: entry.bid.id, action: "reject" });
    rejectBid(entry.bid.id, selectedNft.id);
  };

  const handleCancel = (entry: EnrichedBid) => {
    cancelBid(entry.bid.id, () => setSelectedNft(null));
  };

  const count = nfts?.length ?? 0;
  const lockedCount = escrow.nfts.length;
  const meta = isLoading
    ? "…"
    : lockedCount > 0
      ? `${count} in your wallet, ${lockedCount} locked in bids`
      : `${count} in your wallet`;

  return (
    <div>
      <PageHeader
        title="My NFTs"
        meta={meta}
      />

      <NFTGrid
        nfts={allNfts}
        variant="compact"
        isLoading={isLoading}
        onNFTClick={setSelectedNft}
        bidCounts={bidCounts}
        escrowedIds={escrowedIds}
        empty={
          <EmptyState
            title="Nothing in your wallet yet"
            description="Mint a few NFTs to have something to trade."
            action={
              <Button asChild size="sm">
                <Link to="/mint">Mint your first NFT</Link>
              </Button>
            }
          />
        }
      />

      <IncomingBidsDialog
        nft={selectedNft}
        bids={bidsForSelected}
        isLoading={bidsLoading}
        open={!!selectedNft && !selectedEscrowEntry}
        onOpenChange={(open) => {
          if (!open && !pending) setSelectedNft(null);
        }}
        onAccept={handleAccept}
        onReject={handleReject}
        pendingBidId={pending?.id ?? null}
        pendingAction={pending?.action ?? null}
      />

      <EscrowedNftDialog
        nft={selectedNft}
        entry={selectedEscrowEntry}
        open={!!selectedNft && !!selectedEscrowEntry}
        onOpenChange={(open) => {
          if (!open) setSelectedNft(null);
        }}
        onCancel={handleCancel}
        isCancelling={isCancelling}
      />
    </div>
  );
}
