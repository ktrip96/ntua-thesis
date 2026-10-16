import { useQuery } from "@tanstack/react-query";
import { useCurrentClient } from "@mysten/dapp-kit-react";
import { NFT_TYPE } from "@/config/constants";
import { OBJECT_INCLUDE, nftFromObject } from "@/lib/bidEnriched";
import type { SuiClientTypes } from "@mysten/sui/client";
import type { MarketplaceNFT } from "@/types";

export function useOwnedNFTs(address: string | undefined) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ["ownedNFTs", address],
    queryFn: async (): Promise<MarketplaceNFT[]> => {
      if (!address) return [];

      const nfts: MarketplaceNFT[] = [];
      let cursor: string | null = null;

      do {
        const page: SuiClientTypes.ListOwnedObjectsResponse<
          typeof OBJECT_INCLUDE
        > = await client.core.listOwnedObjects({
          owner: address,
          type: NFT_TYPE,
          include: OBJECT_INCLUDE,
          cursor,
        });

        for (const obj of page.objects) {
          const nft = nftFromObject(obj);
          if (nft) nfts.push({ ...nft, owner: address });
        }

        cursor = page.hasNextPage ? page.cursor : null;
      } while (cursor);

      return nfts;
    },
    enabled: !!address,
  });
}
