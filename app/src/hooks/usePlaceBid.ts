import { useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { BARTER_MODULE, NFT_TYPE } from "@/config/constants";
import { useTransactionMutation } from "@/hooks/useTransactionMutation";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { useTxToast } from "@/components/TxToast";

export function usePlaceBid() {
  const { mutate, isPending } = useTransactionMutation();
  const queryClient = useQueryClient();
  const txToast = useTxToast();

  const placeBid = (
    offeredNftIds: string[],
    offeredSuiMist: bigint,
    targetNftId: string | null,
    onSuccess?: () => void,
  ) => {
    const tx = new Transaction();

    const nftArgs = offeredNftIds.map((id) => tx.object(id));
    const offeredVec = tx.makeMoveVec({ type: NFT_TYPE, elements: nftArgs });

    // The contract always takes a Coin<SUI>; a zero split is fine.
    const [suiCoin] = tx.splitCoins(tx.gas, [offeredSuiMist]);

    tx.moveCall({
      target: `${BARTER_MODULE}::place_bid`,
      typeArguments: [NFT_TYPE, NFT_TYPE],
      arguments: [offeredVec, suiCoin, tx.pure.u64(1), tx.pure.option("id", targetNftId)],
    });

    mutate(tx, {
      onSuccess: ({ digest }) => {
        txToast.success("Bid placed", {
          description: "The owner can accept or reject it. Cancel any time to get everything back.",
          digest,
        });
        queryClient.invalidateQueries({ queryKey: ["ownedNFTs"] });
        queryClient.invalidateQueries({ queryKey: ["marketplaceNFTs"] });
        queryClient.invalidateQueries({ queryKey: ["bidsForNFT"] });
        queryClient.invalidateQueries({ queryKey: ["myBids"] });
        onSuccess?.();
      },
      onError: (error) => {
        toast.error("Bid failed", { description: friendlyError(error) });
      },
    });
  };

  return { placeBid, isPending };
}
