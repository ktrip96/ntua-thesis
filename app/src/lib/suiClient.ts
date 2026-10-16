import type { ClientWithCoreApi } from "@mysten/sui/client";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

export const NETWORKS = ["localnet", "devnet", "testnet"] as const;
export type Network = (typeof NETWORKS)[number];

export const LOCALNET_URL = "http://127.0.0.1:9000";

const FULLNODE_URLS: Record<Network, string> = {
  localnet: LOCALNET_URL,
  devnet: "https://fullnode.devnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
};

// Localnet (sui 1.67) lacks gRPC ListEvents, so it gets the JSON-RPC client;
// every read goes through the transport-agnostic Core API either way.
export function createSuiClient(network: Network): ClientWithCoreApi {
  if (network === "localnet") {
    return new SuiJsonRpcClient({ network, url: FULLNODE_URLS[network] });
  }
  return new SuiGrpcClient({ network, baseUrl: FULLNODE_URLS[network] });
}
