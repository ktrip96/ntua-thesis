import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";
import type { Transaction } from "@mysten/sui/transactions";

// A FailedTransaction landed on chain but aborted, so it is surfaced as an error;
// waiting for indexing lets callers invalidate queries safely.
export function useTransactionMutation() {
  const dAppKit = useDAppKit();
  const client = useCurrentClient();
  const queryClient = useQueryClient();

  return useMutation({
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["suiBalance"] });
    },
    mutationFn: async (transaction: Transaction) => {
      const result = await dAppKit.signAndExecuteTransaction({ transaction });

      if (result.$kind === "FailedTransaction") {
        throw new Error(
          result.FailedTransaction.status.error?.message ??
            "Transaction failed",
        );
      }

      await client.core.waitForTransaction({ digest: result.Transaction.digest });
      return result.Transaction;
    },
  });
}
