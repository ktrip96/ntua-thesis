import { useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { BARTER_MODULE, NFT_TYPE } from "@/config/constants";
import { useTransactionMutation } from "@/hooks/useTransactionMutation";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { useTxToast } from "@/components/TxToast";

export function useRejectBid() {
  const { mutate, isPending } = useTransactionMutation();
  const queryClient = useQueryClient();
  const txToast = useTxToast();

  const rejectBid = (bidObjectId: string, targetNftId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${BARTER_MODULE}::reject_bid`,
      typeArguments: [NFT_TYPE, NFT_TYPE],
      arguments: [tx.object(bidObjectId), tx.object(targetNftId)],
    });

    mutate(tx, {
      onSuccess: ({ digest }) => {
        txToast.success("Bid rejected", {
          description: "Their NFTs and SUI went back to the bidder.",
          digest,
        });
        queryClient.invalidateQueries({ queryKey: ["ownedNFTs"] });
        queryClient.invalidateQueries({ queryKey: ["bidsForNFT"] });
        queryClient.invalidateQueries({ queryKey: ["receivedBids"] });
      },
      onError: (error) => {
        toast.error("Reject failed", { description: friendlyError(error) });
      },
    });
  };

  return { rejectBid, isPending };
}
