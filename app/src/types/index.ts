export interface MarketplaceNFT {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  owner: string;
  collection: string;
  rarity: string;
}

export interface BidObject {
  id: string;
  bidder: string;
  offeredCount: number;
  offeredSui: string; // MIST as string for bigint safety
  requestedCount: number;
  targetNftId: string | null;
}

export interface NftMintedEvent {
  nft_id: string;
}

// The bidder is the event sender, not a payload field.
export interface BidPlacedEvent {
  bid_id: string;
  offered_type: string;
  requested_type: string;
  offered_count: string;
  offered_sui: string;
  requested_count: string;
  target_nft_id: string | null;
}
