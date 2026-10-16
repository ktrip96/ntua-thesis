import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { exec, fund, log, mintTx, sleep } from "./lib.mjs";

const PICKS = [
  ["Common Sedan", "Uncommon Coupe", "Rare Supercar", "Common Cottage", "Rare Mansion", "Rare VIP Festival Pass"],
  ["Common Sedan", "Common Cottage", "Uncommon Townhouse", "Common Movie Ticket", "Uncommon Concert Ticket", "Rare VIP Festival Pass"],
];

for (const names of PICKS) {
  const kp = new Ed25519Keypair();
  await fund(kp.toSuiAddress());
  await sleep(500);
  await exec(kp, mintTx(names, kp.toSuiAddress()));
  log("seeded", kp.toSuiAddress().slice(0, 10), names.length, "NFTs");
}
