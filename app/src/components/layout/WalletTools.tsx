import { Drop } from "@phosphor-icons/react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Button } from "@/components/ui/button";
import { useSuiBalance } from "@/hooks/useSuiBalance";
import { useFaucet } from "@/hooks/useFaucet";
import { formatSui } from "@/lib/bidFields";

export function WalletTools() {
  const account = useCurrentAccount();
  const { data: balance, isLoading } = useSuiBalance(account?.address);
  const { requestSui, isPending, network } = useFaucet();

  if (!account) return null;

  const label = isLoading || balance === undefined ? "…" : `${formatSui(balance)} SUI`;
  const isEmpty = balance === 0n;

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden h-9 items-center rounded-full border border-border bg-white px-3.5 font-mono text-xs text-fg-muted tabular-nums sm:inline-flex"
        title={`Balance on ${network}`}
        aria-live="polite"
      >
        {label}
      </span>
      <Button
        variant={isEmpty ? "primary" : "outline"}
        size="sm"
        className="h-9 w-9 px-0 sm:w-auto sm:px-3.5"
        onClick={() => requestSui(account.address)}
        loading={isPending}
        title={`Get test SUI from the ${network} faucet`}
      >
        <Drop weight="bold" />
        <span className="hidden sm:inline">{isPending ? "Requesting…" : "Faucet"}</span>
      </Button>
    </div>
  );
}
