import { useQuery } from "@tanstack/react-query";
import { useCurrentClient } from "@mysten/dapp-kit-react";
import { EVENT_NFT_MINTED } from "@/config/constants";
import { fetchObjects, listAllEvents, nftFromObject } from "@/lib/bidEnriched";
import type { MarketplaceNFT, NftMintedEvent } from "@/types";

export function useMarketplaceNFTs() {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ["marketplaceNFTs"],
    queryFn: async (): Promise<MarketplaceNFT[]> => {
      const events = await listAllEvents(client, EVENT_NFT_MINTED);

      if (events.length === 0) return [];

      const nftIds = events
        .map((e) => (e.json as unknown as NftMintedEvent | null)?.nft_id)
        .filter((id): id is string => !!id);
      const uniqueIds = [...new Set(nftIds)];

      const objects = await fetchObjects(client, uniqueIds);

      const nfts: MarketplaceNFT[] = [];
      for (const obj of objects) {
        const nft = nftFromObject(obj);
        // Object-owned NFTs are escrowed in a bid; only wallet-held ones are on the table.
        if (!nft || !nft.owner) continue;
        nfts.push(nft);
      }

      return nfts;
    },
  });
}
