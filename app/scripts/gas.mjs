import { readFileSync, writeFileSync } from "node:fs";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { requestSuiFromFaucetV2 } from "@mysten/sui/faucet";

const PACKAGE_ID = readFileSync(new URL("../.env", import.meta.url), "utf8").match(/VITE_PACKAGE_ID=(0x[0-9a-f]+)/)[1];
const NFT = `${PACKAGE_ID}::marketplace_nft::MarketplaceNFT`;
const client = new SuiJsonRpcClient({ network: "localnet", url: "http://127.0.0.1:9000" });
const IMG = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=600&fit=crop";

async function fund(a) { await requestSuiFromFaucetV2({ host: "http://127.0.0.1:9123", recipient: a }); for (let i = 0; i < 60; i++) { if (BigInt((await client.core.getBalance({ owner: a })).balance.balance) > 0n) return; await new Promise(r => setTimeout(r, 400)); } }
async function largestCoin(a) { const { objects } = await client.core.listCoins({ owner: a, coinType: "0x2::sui::SUI" }); const c = objects.sort((x, y) => Number(BigInt(y.balance) - BigInt(x.balance)))[0]; return { objectId: c.objectId, version: c.version, digest: c.digest }; }
async function owned(a) { const { objects } = await client.core.listOwnedObjects({ owner: a, type: NFT, include: { json: true } }); return objects.map(o => o.objectId); }

const rows = [];
async function measure(label, signer, tx, commands) {
  tx.setSender(signer.toSuiAddress());
  tx.setGasPayment([await largestCoin(signer.toSuiAddress())]);
  const t0 = Date.now();
  const r = await client.core.signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true, events: true } });
  const execMs = Date.now() - t0;
  if (r.$kind === "FailedTransaction") throw new Error(label + ": " + r.FailedTransaction.status.error?.message);
  const digest = r.Transaction.digest;
  await client.core.waitForTransaction({ digest });
  const indexedMs = Date.now() - t0;
  const g = r.Transaction.effects.gasUsed;
  const computation = Number(g.computationCost), storage = Number(g.storageCost), rebate = Number(g.storageRebate);
  rows.push({ label, commands, computation, storage, rebate, net: computation + storage - rebate, execMs, indexedMs });
  console.log(label.padEnd(26), String(computation).padStart(9), String(storage).padStart(10), String(rebate).padStart(10), String(computation + storage - rebate).padStart(11), execMs + "ms", indexedMs + "ms");
  return r.Transaction;
}
function mintTx(n, to) { const tx = new Transaction(); const m = Array.from({ length: n }, (_, i) => tx.moveCall({ target: `${PACKAGE_ID}::marketplace_nft::mint`, arguments: [`Bench ${i}`, "Gas benchmark asset", IMG, "car", "common"].map(s => tx.pure.string(s)) })); tx.transferObjects(m, to); return tx; }
function placeTx(ids, mist, target) { const tx = new Transaction(); const v = tx.makeMoveVec({ type: NFT, elements: ids.map(id => tx.object(id)) }); const [c] = tx.splitCoins(tx.gas, [mist]); tx.moveCall({ target: `${PACKAGE_ID}::barter::place_bid`, typeArguments: [NFT, NFT], arguments: [v, c, tx.pure.u64(1), tx.pure.option("id", target)] }); return tx; }
function acceptTx(bid, ids) { const tx = new Transaction(); const v = tx.makeMoveVec({ type: NFT, elements: ids.map(id => tx.object(id)) }); tx.moveCall({ target: `${PACKAGE_ID}::barter::accept_bid`, typeArguments: [NFT, NFT], arguments: [tx.object(bid), v] }); return tx; }
function endTx(fn, bid, nft) { const tx = new Transaction(); tx.moveCall({ target: `${PACKAGE_ID}::barter::${fn}`, typeArguments: [NFT, NFT], arguments: nft ? [tx.object(bid), tx.object(nft)] : [tx.object(bid)] }); return tx; }
const bidIdOf = (t) => t.events?.find(e => e.eventType.endsWith("::BidPlaced"))?.json.bid_id;

const alice = new Ed25519Keypair(), bob = new Ed25519Keypair();
const A = alice.toSuiAddress(), B = bob.toSuiAddress();
await fund(A); await fund(B);
for (const kp of [alice, bob]) { const tx = new Transaction(); tx.transferObjects([tx.splitCoins(tx.gas, [1n])[0]], kp.toSuiAddress()); tx.setSender(kp.toSuiAddress()); await client.core.signAndExecuteTransaction({ transaction: tx, signer: kp }); }
await new Promise(r => setTimeout(r, 1500));
console.log("label".padEnd(26), "comp".padStart(9), "storage".padStart(10), "rebate".padStart(10), "net".padStart(11));

await measure("mint x1", alice, mintTx(1, A), 1);
await measure("mint x3", alice, mintTx(3, A), 3);
await measure("mint x10", alice, mintTx(10, A), 10);
let bobNfts = await owned(B); if (bobNfts.length < 6) { const tx = mintTx(6, B); tx.setSender(B); await client.core.signAndExecuteTransaction({ transaction: tx, signer: bob }); await new Promise(r => setTimeout(r, 800)); bobNfts = await owned(B); }
let aliceNfts = await owned(A);
const take = (arr, n) => arr.splice(0, n);
const includeEv = { events: true };

const p1 = bidIdOf(await measure("place_bid: SUI only", alice, placeTx([], 100_000_000n, bobNfts[0]), 3));
const p2 = bidIdOf(await measure("place_bid: 1 NFT", alice, placeTx(take(aliceNfts, 1), 0n, bobNfts[1]), 3));
const p3 = bidIdOf(await measure("place_bid: 3 NFTs", alice, placeTx(take(aliceNfts, 3), 0n, bobNfts[2]), 3));
const p4 = bidIdOf(await measure("place_bid: 3 NFTs + SUI", alice, placeTx(take(aliceNfts, 3), 100_000_000n, bobNfts[3]), 3));
await measure("accept_bid: SUI only", bob, acceptTx(p1, [bobNfts[0]]), 2);
await measure("accept_bid: 1 NFT", bob, acceptTx(p2, [bobNfts[1]]), 2);
await measure("accept_bid: 3 NFTs", bob, acceptTx(p3, [bobNfts[2]]), 2);
await measure("accept_bid: 3 NFTs + SUI", bob, acceptTx(p4, [bobNfts[3]]), 2);
const p5 = bidIdOf(await measure("place_bid: 1 NFT (for reject)", alice, placeTx(take(aliceNfts, 1), 0n, bobNfts[4]), 3));
await measure("reject_bid: 1 NFT", bob, endTx("reject_bid", p5, bobNfts[4]), 1);
const p6 = bidIdOf(await measure("place_bid: 1 NFT (for cancel)", alice, placeTx(take(aliceNfts, 1), 0n, bobNfts[5]), 3));
await measure("cancel_bid: 1 NFT", alice, endTx("cancel_bid", p6), 1);

const keep = rows.filter(r => !r.label.includes("(for "));
const idx = keep.map(r => r.indexedMs);
const out = { referenceGasPrice: (await client.core.getReferenceGasPrice()).referenceGasPrice ?? "1000", avgIndexedMs: Math.round(idx.reduce((a, b) => a + b, 0) / idx.length), minIndexedMs: Math.min(...idx), maxIndexedMs: Math.max(...idx), avgExecMs: Math.round(keep.reduce((a, r) => a + r.execMs, 0) / keep.length), rows: keep };
writeFileSync(new URL("../../Thesis/latex/figures/gas-measurements.json", import.meta.url).pathname, JSON.stringify(out, null, 2));
console.log("saved; avg exec", out.avgExecMs, "ms, avg indexed", out.avgIndexedMs, "ms");
