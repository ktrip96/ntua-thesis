import { useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { BARTER_MODULE, NFT_TYPE } from "@/config/constants";
import { useTransactionMutation } from "@/hooks/useTransactionMutation";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { useTxToast } from "@/components/TxToast";

interface AcceptOptions {
  description?: string;
  onSuccess?: () => void;
}

export function useAcceptBid() {
  const { mutate, isPending } = useTransactionMutation();
  const queryClient = useQueryClient();
  const txToast = useTxToast();

  const acceptBid = (bidObjectId: string, counterNftIds: string[], options: AcceptOptions = {}) => {
    const tx = new Transaction();

    const nftArgs = counterNftIds.map((id) => tx.object(id));
    const vec = tx.makeMoveVec({ type: NFT_TYPE, elements: nftArgs });

    tx.moveCall({
      target: `${BARTER_MODULE}::accept_bid`,
      typeArguments: [NFT_TYPE, NFT_TYPE],
      arguments: [tx.object(bidObjectId), vec],
    });

    mutate(tx, {
      onSuccess: ({ digest }) => {
        txToast.success("Trade complete", {
          description: options.description ?? "The NFTs have been swapped.",
          digest,
        });
        queryClient.invalidateQueries({ queryKey: ["ownedNFTs"] });
        queryClient.invalidateQueries({ queryKey: ["marketplaceNFTs"] });
        queryClient.invalidateQueries({ queryKey: ["bidsForNFT"] });
        queryClient.invalidateQueries({ queryKey: ["myBids"] });
        queryClient.invalidateQueries({ queryKey: ["receivedBids"] });
        options.onSuccess?.();
      },
      onError: (error) => {
        toast.error("Accept failed", { description: friendlyError(error) });
      },
    });
  };

  return { acceptBid, isPending };
}
