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
import { parseOptionalId } from "@/lib/bidFields";
import type { BidObject, BidPlacedEvent } from "@/types";

export function useReceivedBids(address: string | undefined) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ["receivedBids", address],
    queryFn: async (): Promise<EnrichedBid[]> => {
      if (!address) return [];

      const events = await listAllEvents(client, EVENT_BID_PLACED);

      // The bidder is the event sender; untargeted bids are addressed to no one.
      const candidates = events
        .filter((e) => e.sender !== address)
        .map((e) => e.json as unknown as BidPlacedEvent | null)
        .filter((e): e is BidPlacedEvent => !!e && !!parseOptionalId(e.target_nft_id));

      if (candidates.length === 0) return [];

      const uniqueBidIds = [...new Set(candidates.map((c) => c.bid_id))];

      const bidObjects = await fetchObjects(client, uniqueBidIds);

      // A missing object means the bid was accepted, rejected or cancelled.
      const bids = bidObjects
        .map(parseBidObject)
        .filter((b): b is BidObject => !!b);

      if (bids.length === 0) return [];

      const targetIds = [
        ...new Set(
          bids.map((b) => b.targetNftId).filter((id): id is string => !!id),
        ),
      ];
      const targetLookup = await fetchNfts(client, targetIds);

      const myReceived = bids.filter((b) => {
        if (!b.targetNftId) return false;
        const nft = targetLookup.get(b.targetNftId);
        return !!nft && nft.owner === address;
      });

      if (myReceived.length === 0) return [];

      const offeredByBid = await Promise.all(
        myReceived.map((b) => fetchOfferedNfts(client, b.id)),
      );

      return myReceived.map((bid, i) => ({
        bid,
        targetNft: bid.targetNftId ? targetLookup.get(bid.targetNftId) ?? null : null,
        offeredNfts: offeredByBid[i],
      }));
    },
    enabled: !!address,
  });
}
