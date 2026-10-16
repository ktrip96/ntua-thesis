import { useQuery } from "@tanstack/react-query";
import { useCurrentClient } from "@mysten/dapp-kit-react";
import { EVENT_BID_PLACED } from "@/config/constants";
import {
  fetchNfts,
  fetchObjects,
  fetchOfferedNfts,
  listAllEvents,
  parseBidObject,
  type EnrichedBid,
} from "@/lib/bidEnriched";
import type { BidObject, BidPlacedEvent } from "@/types";

export function useMyBids(address: string | undefined) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ["myBids", address],
    queryFn: async (): Promise<EnrichedBid[]> => {
      if (!address) return [];

      const events = await listAllEvents(client, EVENT_BID_PLACED);

      const myBidIds = events
        .filter((e) => e.sender === address)
        .map((e) => (e.json as unknown as BidPlacedEvent | null)?.bid_id)
        .filter((id): id is string => !!id);

      if (myBidIds.length === 0) return [];

      const uniqueBidIds = [...new Set(myBidIds)];

      const bidObjects = await fetchObjects(client, uniqueBidIds);

      const bids = bidObjects
        .map(parseBidObject)
        .filter((b): b is BidObject => !!b);

      const targetIds = [
        ...new Set(
          bids.map((b) => b.targetNftId).filter((id): id is string => !!id),
        ),
      ];
      const targetLookup = await fetchNfts(client, targetIds);

      const offeredByBid = await Promise.all(
        bids.map((b) => fetchOfferedNfts(client, b.id)),
      );

      return bids.map((bid, i) => ({
        bid,
        targetNft: bid.targetNftId ? targetLookup.get(bid.targetNftId) ?? null : null,
        offeredNfts: offeredByBid[i],
      }));
    },
    enabled: !!address,
  });
}
