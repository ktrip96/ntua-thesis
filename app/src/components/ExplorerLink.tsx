import { ArrowUpRight } from "@phosphor-icons/react";
import { useCurrentNetwork } from "@mysten/dapp-kit-react";
import { explorerName, explorerUrl, type ExplorerEntity } from "@/lib/explorer";
import { cn } from "@/lib/utils";

interface ExplorerLinkProps {
  id: string;
  entity?: ExplorerEntity;
  className?: string;
  size?: "xs" | "sm" | "md";
}

export function ExplorerLink({ id, entity = "object", className, size = "sm" }: ExplorerLinkProps) {
  const network = useCurrentNetwork();
  const label = `View on ${explorerName(network)}`;
  const iconClass = size === "xs" ? "size-[11px]" : size === "sm" ? "size-3" : "size-4";
  return (
    <a
      href={explorerUrl(network, entity, id)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-link transition-colors duration-300 ease-out-soft hover:text-blueberry-700",
        className,
      )}
    >
      <ArrowUpRight className={iconClass} weight="bold" />
    </a>
  );
}

export function AddressLink({
  address,
  objectId,
  className,
  text,
}: {
  address: string;
  objectId?: string;
  className?: string;
  text?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs text-fg-muted", className)}>
      {text ?? truncate(address)}
      {objectId ? (
        <ExplorerLink id={objectId} entity="object" size="sm" />
      ) : (
        <ExplorerLink id={address} entity="address" size="sm" />
      )}
    </span>
  );
}

function truncate(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
