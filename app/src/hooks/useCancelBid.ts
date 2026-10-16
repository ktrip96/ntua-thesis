import { useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { BARTER_MODULE, NFT_TYPE } from "@/config/constants";
import { useTransactionMutation } from "@/hooks/useTransactionMutation";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { useTxToast } from "@/components/TxToast";

export function useCancelBid() {
  const { mutate, isPending } = useTransactionMutation();
  const queryClient = useQueryClient();
  const txToast = useTxToast();

  const cancelBid = (bidObjectId: string, onSuccess?: () => void) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${BARTER_MODULE}::cancel_bid`,
      typeArguments: [NFT_TYPE, NFT_TYPE],
      arguments: [tx.object(bidObjectId)],
    });

    mutate(tx, {
      onSuccess: ({ digest }) => {
        txToast.success("Bid cancelled", {
          description: "Your NFTs and SUI are back in your wallet.",
          digest,
        });
        queryClient.invalidateQueries({ queryKey: ["ownedNFTs"] });
        queryClient.invalidateQueries({ queryKey: ["marketplaceNFTs"] });
        queryClient.invalidateQueries({ queryKey: ["myBids"] });
        onSuccess?.();
      },
      onError: (error) => {
        toast.error("Cancel failed", { description: friendlyError(error) });
      },
    });
  };

  return { cancelBid, isPending };
}
