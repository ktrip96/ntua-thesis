import { ArrowUpRight } from "@phosphor-icons/react";
import { useCurrentNetwork } from "@mysten/dapp-kit-react";
import { toast } from "sonner";
import { explorerName, explorerUrl } from "@/lib/explorer";
import type { Network } from "@/lib/suiClient";

interface TxToastOptions {
  description?: string;
  digest?: string;
}

function ExplorerRow({ network, digest }: { network: Network; digest: string }) {
  return (
    <a
      href={explorerUrl(network, "tx", digest)}
      target="_blank"
      rel="noreferrer"
      className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-link transition-colors duration-300 ease-out-soft hover:text-blueberry-700"
    >
      View on {explorerName(network)}
      <ArrowUpRight className="size-3" weight="bold" />
    </a>
  );
}

export function useTxToast() {
  const network = useCurrentNetwork();

  const success = (title: string, { description, digest }: TxToastOptions = {}) =>
    toast.success(title, {
      description: (
        <>
          {description && <span className="block">{description}</span>}
          {digest && <ExplorerRow network={network} digest={digest} />}
        </>
      ),
    });

  return { success };
}
