import { createDAppKit } from "@mysten/dapp-kit-react";
import { NETWORKS, createSuiClient } from "./lib/suiClient";

export const dAppKit = createDAppKit({
  networks: [...NETWORKS],
  defaultNetwork: "localnet",
  enableBurnerWallet: import.meta.env.DEV,
  createClient: createSuiClient,
});

// Lets the dApp Kit hooks infer this instance's networks and client type.
declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
