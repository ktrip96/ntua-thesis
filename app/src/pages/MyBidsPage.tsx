import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { WalletGate } from "@/components/WalletGate";
import { EmptyState } from "@/components/EmptyState";
import { BidRow, type BidAction } from "@/components/bid/BidRow";
import { useMyBids } from "@/hooks/useMyBids";
import { useReceivedBids } from "@/hooks/useReceivedBids";
import { useCancelBid } from "@/hooks/useCancelBid";
import { useAcceptBid } from "@/hooks/useAcceptBid";
import { useRejectBid } from "@/hooks/useRejectBid";
import { receivedSummary } from "@/lib/bidEnriched";

export function MyBidsPage() {
  const account = useCurrentAccount();

  if (!account) {
    return (
      <WalletGate
        title="Your trades live here"
        description="Connect your wallet to see bids you've received and placed."
      />
    );
  }

  return <BidsContent address={account.address} />;
}

function BidsContent({ address }: { address: string }) {
  const received = useReceivedBids(address);
  const placed = useMyBids(address);
  const { acceptBid, isPending: isAccepting } = useAcceptBid();
  const { rejectBid, isPending: isRejecting } = useRejectBid();
  const { cancelBid, isPending: isCancelling } = useCancelBid();
  const [pending, setPending] = useState<{ id: string; action: BidAction } | null>(null);

  useEffect(() => {
    if (!isAccepting && !isRejecting && !isCancelling) setPending(null);
  }, [isAccepting, isRejecting, isCancelling]);

  const receivedCount = received.data?.length ?? 0;
  const placedCount = placed.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader title="My bids" />

      <Tabs defaultValue="received">
        <TabsList>
          <TabsTrigger value="received">
            Received
            {receivedCount > 0 && <span className="text-dragonfruit-600">{receivedCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="placed">
            Placed
            {placedCount > 0 && <span className="text-fg-subtle">{placedCount}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {received.isLoading ? (
            <RowSkeletons />
          ) : receivedCount === 0 ? (
            <EmptyState
              title="No bids received yet"
              description="When someone wants one of your NFTs, their offer shows up here."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {received.data!.map((entry) => {
                const targetId = entry.targetNft?.id;
                return (
                  <BidRow
                    key={entry.bid.id}
                    entry={entry}
                    direction="received"
                    onAccept={
                      targetId
                        ? () => {
                            setPending({ id: entry.bid.id, action: "accept" });
                            acceptBid(entry.bid.id, [targetId], {
                              description: receivedSummary(entry),
                            });
                          }
                        : undefined
                    }
                    onReject={
                      targetId
                        ? () => {
                            setPending({ id: entry.bid.id, action: "reject" });
                            rejectBid(entry.bid.id, targetId);
                          }
                        : undefined
                    }
                    pending={pending?.id === entry.bid.id ? pending.action : null}
                    disabled={!!pending && pending.id !== entry.bid.id}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="placed">
          {placed.isLoading ? (
            <RowSkeletons />
          ) : placedCount === 0 ? (
            <EmptyState
              title="You haven't placed any bids yet"
              description="Find something you like in the marketplace and make an offer."
              action={
                <Button asChild variant="outline-primary" size="sm">
                  <Link to="/">Browse the marketplace</Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {placed.data!.map((entry) => (
                <BidRow
                  key={entry.bid.id}
                  entry={entry}
                  direction="placed"
                  onCancel={() => {
                    setPending({ id: entry.bid.id, action: "cancel" });
                    cancelBid(entry.bid.id);
                  }}
                  pending={pending?.id === entry.bid.id ? pending.action : null}
                  disabled={!!pending && pending.id !== entry.bid.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RowSkeletons() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <div className="skeleton h-[74px] rounded-2xl" />
      <div className="skeleton h-[74px] rounded-2xl" />
      <div className="skeleton h-[74px] rounded-2xl" />
    </div>
  );
}
