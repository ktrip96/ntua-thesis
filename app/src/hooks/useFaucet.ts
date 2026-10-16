import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentClient, useCurrentNetwork } from "@mysten/dapp-kit-react";
import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import { formatSui } from "@/lib/bidFields";
import { toast } from "sonner";
import { useTxToast } from "@/components/TxToast";

export function useFaucet() {
  const client = useCurrentClient();
  const network = useCurrentNetwork();
  const queryClient = useQueryClient();
  const txToast = useTxToast();

  const mutation = useMutation({
    mutationFn: async (recipient: string) => {
      const before = BigInt((await client.core.getBalance({ owner: recipient })).balance.balance);
      const result = await requestSuiFromFaucetV2({ host: getFaucetHost(network), recipient });
      const received = (result.coins_sent ?? []).reduce((sum, c) => sum + BigInt(c.amount), 0n);
      const digest = result.coins_sent?.[0]?.transferTxDigest;

      // The faucet replies before the node has indexed the transfer.
      for (let i = 0; i < 20; i++) {
        const now = BigInt((await client.core.getBalance({ owner: recipient })).balance.balance);
        if (now > before) return { received: received || now - before, digest };
        await new Promise((r) => setTimeout(r, 500));
      }
      return { received, digest };
    },
    onSuccess: ({ received, digest }) => {
      txToast.success("Test SUI received", {
        description: received > 0n ? `${formatSui(received)} SUI landed in your wallet.` : "Your balance will update shortly.",
        digest,
      });
      queryClient.invalidateQueries({ queryKey: ["suiBalance"] });
    },
    onError: (error) => {
      const description =
        error instanceof FaucetRateLimitError
          ? "The faucet is rate-limiting this address. Try again in a minute."
          : error instanceof Error
            ? error.message
            : "The faucet did not respond.";
      toast.error("Faucet request failed", { description });
    },
  });

  return { requestSui: mutation.mutate, isPending: mutation.isPending, network };
}
