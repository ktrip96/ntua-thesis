import { useQuery } from "@tanstack/react-query";
import { useCurrentClient } from "@mysten/dapp-kit-react";

export function useSuiBalance(address: string | undefined) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ["suiBalance", address],
    queryFn: async (): Promise<bigint> => {
      if (!address) return 0n;
      const { balance } = await client.core.getBalance({ owner: address });
      return BigInt(balance.balance);
    },
    enabled: !!address,
    refetchInterval: 15_000,
  });
}
