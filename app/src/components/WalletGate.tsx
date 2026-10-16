import { Wallet } from "@phosphor-icons/react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { EmptyState } from "@/components/EmptyState";

interface WalletGateProps {
  title: string;
  description: string;
}

export function WalletGate({ title, description }: WalletGateProps) {
  return (
    <div className="mx-auto max-w-md py-10">
      <EmptyState
        icon={<Wallet className="size-5" weight="bold" />}
        title={title}
        description={description}
        action={<ConnectButton />}
      />
    </div>
  );
}
