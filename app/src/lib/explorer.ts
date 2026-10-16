import type { Network } from "@/lib/suiClient";

export type ExplorerEntity = "tx" | "object" | "address";

interface Explorer {
  name: string;
  url: (entity: ExplorerEntity, id: string) => string;
}

// Polymedia is the only hosted explorer that can read a local node.
const EXPLORERS: Record<Network, Explorer> = {
  localnet: {
    name: "Polymedia Explorer",
    url: (entity, id) =>
      `https://explorer.polymedia.app/${{ tx: "txblock", object: "object", address: "address" }[entity]}/${id}?network=local`,
  },
  testnet: {
    name: "SuiVision",
    url: (entity, id) =>
      `https://testnet.suivision.xyz/${{ tx: "txblock", object: "object", address: "account" }[entity]}/${id}`,
  },
  devnet: {
    name: "Suiscan",
    url: (entity, id) =>
      `https://suiscan.xyz/devnet/${{ tx: "tx", object: "object", address: "account" }[entity]}/${id}`,
  },
};

export function explorerName(network: Network): string {
  return EXPLORERS[network].name;
}

export function explorerUrl(network: Network, entity: ExplorerEntity, id: string): string {
  return EXPLORERS[network].url(entity, id);
}
