export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;

if (!PACKAGE_ID) {
  throw new Error(
    "VITE_PACKAGE_ID is not set. Run ./scripts/sync-env.sh or ./scripts/deploy.sh first.",
  );
}

export const NFT_MODULE = `${PACKAGE_ID}::marketplace_nft`;
export const BARTER_MODULE = `${PACKAGE_ID}::barter`;

export const NFT_TYPE = `${NFT_MODULE}::MarketplaceNFT`;
export const BID_TYPE = `${BARTER_MODULE}::Bid`;

export const EVENT_NFT_MINTED = `${NFT_MODULE}::NftMinted`;
export const EVENT_BID_PLACED = `${BARTER_MODULE}::BidPlaced`;
export const EVENT_BID_ACCEPTED = `${BARTER_MODULE}::BidAccepted`;
export const EVENT_BID_CANCELLED = `${BARTER_MODULE}::BidCancelled`;
export const EVENT_BID_REJECTED = `${BARTER_MODULE}::BidRejected`;
