import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { FaucetRateLimitError } from "@mysten/sui/faucet";
import { CATALOG, NETWORK, PACKAGE_ID, balance, bidIdOf, client, exec, fund, log, mintTx, owned, placeTx, short, sleep } from "./lib.mjs";

const SUI = 1_000_000_000n;
const PRESENTER = process.env.PRESENTER;
const WALLET_FILE = new URL(`../.demo-wallets.${NETWORK}.json`, import.meta.url).pathname;
const PER_WALLET = NETWORK === "localnet" ? 20n * SUI : 1n * SUI;

const PERSONAS = [
  { name: "Ariadne", mints: ["Rare Supercar", "Common Sedan", "Uncommon Townhouse", "Common Movie Ticket"] },
  { name: "Basil", mints: ["Uncommon Coupe", "Rare Mansion", "Common Cottage", "Rare VIP Festival Pass"] },
  { name: "Chloe", mints: ["Common Sedan", "Common Sedan", "Uncommon Concert Ticket", "Rare Mansion"] },
  { name: "Dimitris", mints: ["Rare Supercar", "Common Cottage", "Uncommon Townhouse", "Common Movie Ticket", "Uncommon Coupe"] },
  { name: "Eleni", mints: ["Rare VIP Festival Pass", "Uncommon Concert Ticket", "Common Sedan", "Common Cottage"] },
];

async function funder() {
  if (process.env.FUNDER_KEY) {
    const { secretKey } = decodeSuiPrivateKey(process.env.FUNDER_KEY);
    const kp = Ed25519Keypair.fromSecretKey(secretKey);
    log(`funder ${short(kp.toSuiAddress())} from FUNDER_KEY, balance ${Number(await balance(kp.toSuiAddress())) / 1e9} SUI`);
    return kp;
  }
  const kp = new Ed25519Keypair();
  const need = PER_WALLET * BigInt(PERSONAS.length) + 2n * SUI;
  log(`funder ${short(kp.toSuiAddress())} via ${NETWORK} faucet, need ${Number(need) / 1e9} SUI`);
  for (let attempt = 0; (await balance(kp.toSuiAddress())) < need && attempt < 12; attempt++) {
    try { await fund(kp.toSuiAddress()); }
    catch (e) {
      if (!(e instanceof FaucetRateLimitError)) throw e;
      log("faucet rate limited, waiting 60 s");
      await sleep(60_000);
    }
  }
  const have = await balance(kp.toSuiAddress());
  if (have < need) throw new Error(`funder has ${Number(have) / 1e9} SUI, needs ${Number(need) / 1e9}; pass FUNDER_KEY=suiprivkey... with a funded ${NETWORK} wallet`);
  return kp;
}

const treasury = await funder();
const wallets = PERSONAS.map((p) => ({ ...p, kp: new Ed25519Keypair() }));
{
  const tx = new Transaction();
  const coins = tx.splitCoins(tx.gas, wallets.map(() => PER_WALLET));
  wallets.forEach((w, i) => tx.transferObjects([coins[i]], w.kp.toSuiAddress()));
  await exec(treasury, tx);
  log(`funded ${wallets.length} wallets with ${Number(PER_WALLET) / 1e9} SUI each`);
}
await sleep(1500);

for (const w of wallets) {
  await exec(w.kp, mintTx(w.mints, w.kp.toSuiAddress()));
  w.nfts = await owned(w.kp.toSuiAddress());
  log(`${w.name.padEnd(9)} ${short(w.kp.toSuiAddress())} minted ${w.mints.join(", ")}`);
}
const by = (w, name) => w.nfts.find((n) => n.name === name && !n.used);
const take = (w, name) => { const n = by(w, name); if (!n) throw new Error(`${w.name} has no free ${name}`); n.used = true; return n.id; };
const [ariadne, basil, chloe, dimitris, eleni] = wallets;

const bids = [];
async function bid(from, offeredNames, mist, to, targetName, label) {
  const ids = offeredNames.map((n) => take(from, n));
  const target = by(to, targetName)?.id ?? to.nfts.find((n) => n.name === targetName).id;
  const id = bidIdOf(await exec(from.kp, placeTx(ids, mist, target)));
  bids.push({ id, label, from: from.name, to: to.name, target: targetName });
  log(`bid  ${from.name} → ${to.name}: ${label}`);
}
await bid(ariadne, ["Common Sedan"], 0n, basil, "Uncommon Coupe", "1 NFT for 1 NFT");
await bid(chloe, [], SUI / 2n, basil, "Uncommon Coupe", "0.5 SUI only, same target (conflicting bid)");
await bid(dimitris, ["Common Cottage", "Uncommon Townhouse"], SUI / 4n, basil, "Rare Mansion", "2 NFTs + 0.25 SUI for a Rare");
await bid(basil, ["Common Cottage"], SUI, ariadne, "Rare Supercar", "1 NFT + 1 SUI for a Rare");
await bid(eleni, ["Uncommon Concert Ticket"], 0n, chloe, "Rare Mansion", "cross-collection: ticket for a house");
await bid(chloe, ["Common Sedan"], SUI / 10n, dimitris, "Uncommon Coupe", "1 NFT + 0.1 SUI");

if (PRESENTER) {
  const gifts = [take(dimitris, "Rare Supercar"), take(eleni, "Common Sedan")];
  const tx1 = new Transaction(); tx1.transferObjects([tx1.object(gifts[0])], PRESENTER); await exec(dimitris.kp, tx1);
  const tx2 = new Transaction(); tx2.transferObjects([tx2.object(gifts[1])], PRESENTER); await exec(eleni.kp, tx2);
  await sleep(1000);
  const b1 = bidIdOf(await exec(ariadne.kp, placeTx([take(ariadne, "Uncommon Townhouse")], SUI / 2n, gifts[0])));
  const b2 = bidIdOf(await exec(basil.kp, placeTx([take(basil, "Rare VIP Festival Pass")], 0n, gifts[0])));
  const b3 = bidIdOf(await exec(chloe.kp, placeTx([], SUI / 5n, gifts[1])));
  bids.push({ id: b1, label: "presenter: Townhouse + 0.5 SUI for Rare Supercar", from: "Ariadne", to: "presenter" });
  bids.push({ id: b2, label: "presenter: VIP Pass for Rare Supercar", from: "Basil", to: "presenter" });
  bids.push({ id: b3, label: "presenter: 0.2 SUI for Common Sedan", from: "Chloe", to: "presenter" });
  log(`presenter ${short(PRESENTER)} received Rare Supercar + Common Sedan and 3 incoming bids`);
}

const record = {
  network: NETWORK, packageId: PACKAGE_ID, createdAt: new Date().toISOString(), presenter: PRESENTER ?? null,
  treasury: { address: treasury.toSuiAddress(), secretKey: process.env.FUNDER_KEY ? "(FUNDER_KEY)" : treasury.getSecretKey() },
  wallets: wallets.map((w) => ({ name: w.name, address: w.kp.toSuiAddress(), secretKey: w.kp.getSecretKey(), nfts: w.nfts.map((n) => n.name) })),
  bids,
};
const previous = existsSync(WALLET_FILE) ? JSON.parse(readFileSync(WALLET_FILE, "utf8")) : [];
writeFileSync(WALLET_FILE, JSON.stringify([...(Array.isArray(previous) ? previous : [previous]), record], null, 2));
log(`done: ${wallets.length} wallets, ${wallets.reduce((n, w) => n + w.mints.length, 0)} NFTs, ${bids.length} bids on ${NETWORK}; keys saved to ${WALLET_FILE}`);
