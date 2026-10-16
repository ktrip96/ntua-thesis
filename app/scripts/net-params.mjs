import { SuiGrpcClient } from "@mysten/sui/grpc";
for (const [net, url] of [["mainnet", "https://fullnode.mainnet.sui.io:443"], ["testnet", "https://fullnode.testnet.sui.io:443"]]) {
  const c = new SuiGrpcClient({ network: net, baseUrl: url });
  const call = await c.ledgerService.getEpoch({ readMask: { paths: ["epoch", "reference_gas_price", "protocol_config"] } });
  const e = call.response.epoch;
  const a = e.protocolConfig?.attributes ?? {};
  const pick = (k) => a[k];
  console.log(net, JSON.stringify({ epoch: String(e.epoch), rgp: String(e.referenceGasPrice), protocolVersion: String(e.protocolConfig?.protocolVersion), storage_gas_price: pick("storage_gas_price"), storage_rebate_rate: pick("storage_rebate_rate"), max_arguments: pick("max_arguments"), max_programmable_tx_commands: pick("max_programmable_tx_commands"), max_input_objects: pick("max_input_objects"), max_gas_budget: pick("max_gas_budget") }));
}
