import { useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { NFT_MODULE } from "@/config/constants";
import type { CatalogItem } from "@/config/catalog";
import { useTransactionMutation } from "@/hooks/useTransactionMutation";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { useTxToast } from "@/components/TxToast";

export function useMintNFT() {
  const { mutate, isPending } = useTransactionMutation();
  const queryClient = useQueryClient();
  const account = useCurrentAccount();
  const txToast = useTxToast();

  const mint = (item: CatalogItem, quantity: number, onSettled?: () => void) => {
    if (!account) return;
    const tx = new Transaction();

    // `mint` returns the NFT; the PTB delivers the batch to the sender.
    const minted = Array.from({ length: quantity }, () =>
      tx.moveCall({
        target: `${NFT_MODULE}::mint`,
        arguments: [
          tx.pure.string(item.name),
          tx.pure.string(item.description),
          tx.pure.string(item.imageUrl),
          tx.pure.string(item.collection),
          tx.pure.string(item.rarity),
        ],
      }),
    );
    tx.transferObjects(minted, account.address);

    mutate(tx, {
      onSuccess: ({ digest }) => {
        txToast.success(quantity === 1 ? "Minted" : `Minted ×${quantity}`, {
          description: `${item.name} is in your wallet.`,
          digest,
        });
        queryClient.invalidateQueries({ queryKey: ["ownedNFTs"] });
        queryClient.invalidateQueries({ queryKey: ["marketplaceNFTs"] });
        onSettled?.();
      },
      onError: (error) => {
        toast.error("Mint failed", { description: friendlyError(error) });
        onSettled?.();
      },
    });
  };

  return { mint, isPending };
}
