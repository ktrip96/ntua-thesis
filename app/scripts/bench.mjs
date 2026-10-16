import { readFileSync, writeFileSync } from "node:fs";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { requestSuiFromFaucetV2 } from "@mysten/sui/faucet";

const PACKAGE_ID = readFileSync(new URL("../.env", import.meta.url), "utf8").match(/VITE_PACKAGE_ID=(0x[0-9a-f]+)/)[1];
const NFT = `${PACKAGE_ID}::marketplace_nft::MarketplaceNFT`;
const BID_PLACED = `${PACKAGE_ID}::barter::BidPlaced`;
const client = new SuiJsonRpcClient({ network: "localnet", url: "http://127.0.0.1:9000" });
const IMG = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=600&fit=crop";
const OUT = new URL("../../Thesis/latex/figures/benchmarks.json", import.meta.url).pathname;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2); };
const results = { note: "localnet, sui 1.67.1, single validator, JSON-RPC client, reference gas price 1000", bidSize: [], mintBatch: [], throughput: {}, contention: [], discovery: [] };

async function fund(a) { await requestSuiFromFaucetV2({ host: "http://127.0.0.1:9123", recipient: a }); for (let i = 0; i < 80; i++) { if (BigInt((await client.core.getBalance({ owner: a })).balance.balance) > 0n) return; await sleep(400); } throw new Error("faucet"); }
async function exec(kp, tx, opts = {}) {
  tx.setSenderIfNotSet(kp.toSuiAddress());
  const t0 = Date.now();
  const r = await client.core.signAndExecuteTransaction({ transaction: tx, signer: kp, include: { effects: true, events: true } });
  const execMs = Date.now() - t0;
  if (r.$kind === "FailedTransaction") { const e = new Error(r.FailedTransaction.status.error?.message ?? "failed"); e.failed = true; throw e; }
  if (!opts.noWait) await client.core.waitForTransaction({ digest: r.Transaction.digest });
  const g = r.Transaction.effects.gasUsed;
  return { tx: r.Transaction, execMs, totalMs: Date.now() - t0, computation: Number(g.computationCost), storage: Number(g.storageCost), rebate: Number(g.storageRebate), net: Number(g.computationCost) + Number(g.storageCost) - Number(g.storageRebate) };
}
async function owned(a) { const out = []; let cursor = null; do { const p = await client.core.listOwnedObjects({ owner: a, type: NFT, cursor }); out.push(...p.objects.map(o => o.objectId)); cursor = p.hasNextPage ? p.cursor : null; } while (cursor); return out; }
function mintTx(n, to) { const tx = new Transaction(); const m = Array.from({ length: n }, (_, i) => tx.moveCall({ target: `${PACKAGE_ID}::marketplace_nft::mint`, arguments: [`Bench ${i}`, "Stress-test asset", IMG, "car", "common"].map(s => tx.pure.string(s)) })); tx.transferObjects(m, to); return tx; }
function placeTx(ids, mist, target) { const tx = new Transaction(); const v = tx.makeMoveVec({ type: NFT, elements: ids.map(id => tx.object(id)) }); const [c] = tx.splitCoins(tx.gas, [mist]); tx.moveCall({ target: `${PACKAGE_ID}::barter::place_bid`, typeArguments: [NFT, NFT], arguments: [v, c, tx.pure.u64(1), tx.pure.option("id", target)] }); return tx; }
function acceptTx(bid, ids) { const tx = new Transaction(); const v = tx.makeMoveVec({ type: NFT, elements: ids.map(id => tx.object(id)) }); tx.moveCall({ target: `${PACKAGE_ID}::barter::accept_bid`, typeArguments: [NFT, NFT], arguments: [tx.object(bid), v] }); return tx; }
const bidIdOf = (t) => t.events.find(e => e.eventType.endsWith("::BidPlaced")).json.bid_id;

const rich = new Ed25519Keypair(); const R = rich.toSuiAddress();
for (let i = 0; i < 4; i++) await requestSuiFromFaucetV2({ host: "http://127.0.0.1:9123", recipient: R });
await sleep(2000);
async function fanOut(n, suiEach) {
  const kps = Array.from({ length: n }, () => new Ed25519Keypair());
  for (let i = 0; i < n; i += 100) {
    const batch = kps.slice(i, i + 100);
    const tx = new Transaction();
    const coins = tx.splitCoins(tx.gas, batch.map(() => BigInt(suiEach) * 1_000_000_000n));
    batch.forEach((kp, j) => tx.transferObjects([coins[j]], kp.toSuiAddress()));
    await exec(rich, tx);
  }
  return kps;
}

{
  const [alice, bob] = await fanOut(2, 600);
  for (const n of [1, 5, 10, 25, 50, 100, 250, 500]) {
   try {
    const target = (await (async () => { await exec(bob, mintTx(1, bob.toSuiAddress())); return (await owned(bob.toSuiAddress())).at(-1); })());
    await exec(alice, mintTx(n, alice.toSuiAddress()));
    const ids = (await owned(alice.toSuiAddress())).slice(0, n);
    const p = await exec(alice, placeTx(ids, 0n, target));
    const bid = bidIdOf(p.tx);
    const a = await exec(bob, acceptTx(bid, [target]));
    results.bidSize.push({ n, place: { computation: p.computation, storage: p.storage, rebate: p.rebate, net: p.net, execMs: p.execMs }, accept: { computation: a.computation, storage: a.storage, rebate: a.rebate, net: a.net, execMs: a.execMs } });
    log(`bidSize n=${n}: place comp ${p.computation} net ${p.net} ${p.execMs}ms | accept comp ${a.computation} net ${a.net} ${a.execMs}ms`);
   } catch (e) { results.bidSize.push({ n, error: String(e.message).slice(0, 200) }); log(`bidSize n=${n}: FAILED ${String(e.message).slice(0, 160)}`); }
  }
}

{
  const [minter] = await fanOut(1, 200);
  for (const n of [1, 10, 50, 100, 200]) {
    const r = await exec(minter, mintTx(n, minter.toSuiAddress()));
    results.mintBatch.push({ n, computation: r.computation, storage: r.storage, rebate: r.rebate, net: r.net, perNft: Math.round(r.net / n), execMs: r.execMs });
    log(`mint x${n}: comp ${r.computation} net ${r.net} (${Math.round(r.net / n)}/NFT) ${r.execMs}ms`);
  }
}

{
  const N = 100;
  const bidders = await fanOut(N, 3), owners = await fanOut(N, 3);
  await Promise.all([...bidders, ...owners].map(kp => exec(kp, mintTx(1, kp.toSuiAddress()), { noWait: true })));
  await sleep(1500);
  const bNft = await Promise.all(bidders.map(kp => owned(kp.toSuiAddress()).then(x => x[0])));
  const oNft = await Promise.all(owners.map(kp => owned(kp.toSuiAddress()).then(x => x[0])));
  let t0 = Date.now();
  const placed = await Promise.allSettled(bidders.map((kp, i) => exec(kp, placeTx([bNft[i]], 0n, oNft[i]), { noWait: true })));
  const placeWall = Date.now() - t0;
  const okPlace = placed.filter(r => r.status === "fulfilled");
  const bids = okPlace.map(r => bidIdOf(r.value.tx));
  await sleep(1500);
  t0 = Date.now();
  const accepted = await Promise.allSettled(owners.slice(0, bids.length).map((kp, i) => exec(kp, acceptTx(bids[i], [oNft[i]]), { noWait: true })));
  const acceptWall = Date.now() - t0;
  const okAccept = accepted.filter(r => r.status === "fulfilled");
  results.throughput = {
    n: N,
    place: { ok: okPlace.length, failed: placed.length - okPlace.length, wallMs: placeWall, tps: +(okPlace.length / (placeWall / 1000)).toFixed(1), medianExecMs: median(okPlace.map(r => r.value.execMs)), maxExecMs: Math.max(...okPlace.map(r => r.value.execMs)) },
    accept: { ok: okAccept.length, failed: accepted.length - okAccept.length, wallMs: acceptWall, tps: +(okAccept.length / (acceptWall / 1000)).toFixed(1), medianExecMs: median(okAccept.map(r => r.value.execMs)), maxExecMs: Math.max(...okAccept.map(r => r.value.execMs)) },
    failures: [...placed, ...accepted].filter(r => r.status === "rejected").map(r => String(r.reason.message).slice(0, 80)).slice(0, 5),
  };
  log("throughput:", JSON.stringify(results.throughput));
}

{
  const alice = (await fanOut(1, 50))[0];
  for (const k of [2, 5, 10, 20]) {
    const racers = await fanOut(k, 2);
    await Promise.all(racers.map(kp => exec(kp, mintTx(1, kp.toSuiAddress()), { noWait: true })));
    await sleep(1200);
    const nfts = await Promise.all(racers.map(kp => owned(kp.toSuiAddress()).then(x => x[0])));
    const rounds = 3; let wins = 0, losses = 0, anomalies = 0; const errs = {};
    for (let r = 0; r < rounds; r++) {
      await exec(alice, mintTx(1, alice.toSuiAddress()));
      const mine = (await owned(alice.toSuiAddress())).at(-1);
      const bid = bidIdOf((await exec(alice, placeTx([mine], 0n, null))).tx);
      const res = await Promise.allSettled(racers.map((kp, i) => exec(kp, acceptTx(bid, [nfts[i]]), { noWait: true })));
      const w = res.filter(x => x.status === "fulfilled").length;
      wins += w; losses += res.length - w; if (w !== 1) anomalies++;
      for (const x of res) if (x.status === "rejected") { const key = String(x.reason.message).replace(/0x[0-9a-f]+/g, "<id>").slice(0, 70); errs[key] = (errs[key] ?? 0) + 1; }
      const winner = res.findIndex(x => x.status === "fulfilled");
      if (winner >= 0) { await client.core.waitForTransaction({ digest: res[winner].value.tx.digest }); await sleep(300); await exec(racers[winner], mintTx(1, racers[winner].toSuiAddress())); nfts[winner] = (await owned(racers[winner].toSuiAddress()))[0]; }
    }
    results.contention.push({ k, rounds, winsPerRound: wins / rounds, totalLosses: losses, anomalies, errors: errs });
    log(`contention k=${k}: wins/round ${wins / rounds}, anomalies ${anomalies}, errors ${JSON.stringify(errs)}`);
  }
}

{
  const owner = (await fanOut(1, 50))[0]; await exec(owner, mintTx(1, owner.toSuiAddress()));
  const target = (await owned(owner.toSuiAddress()))[0];
  const spam = await fanOut(50, 20);
  async function receivedQueryMs() {
    const t0 = Date.now();
    const events = []; let before = null;
    while (true) { const page = await client.core.listEvents({ filter: { eventType: BID_PLACED }, order: "descending", before }); events.push(...page.events); if (!page.hasNextPage || !page.endCursor) break; before = page.endCursor; }
    const ids = [...new Set(events.filter(e => e.sender !== owner.toSuiAddress()).map(e => e.json.bid_id))];
    const objs = []; for (let i = 0; i < ids.length; i += 50) objs.push(...(await client.core.getObjects({ objectIds: ids.slice(i, i + 50), include: { json: true } })).objects);
    const live = objs.filter(o => !(o instanceof Error) && o?.json);
    const targets = [...new Set(live.map(o => o.json.target_nft_id).filter(Boolean))];
    for (let i = 0; i < targets.length; i += 50) await client.core.getObjects({ objectIds: targets.slice(i, i + 50), include: { json: true } });
    return { ms: Date.now() - t0, events: events.length, liveBids: live.length };
  }
  const point = async (label) => { const xs = []; let last; for (let i = 0; i < 3; i++) { last = await receivedQueryMs(); xs.push(last.ms); } results.discovery.push({ label, events: last.events, liveBids: last.liveBids, medianMs: median(xs) }); log(`discovery ${label}: events ${last.events}, live ${last.liveBids}, median ${median(xs)}ms`); };
  await point("baseline");
  for (const wave of [500, 1000, 2000]) {
    const per = (wave - (results.discovery.at(-1).liveBids)) / spam.length;
    for (let r = 0; r < per; r++) { await Promise.allSettled(spam.map(kp => exec(kp, placeTx([], 1_000_000n, target), { noWait: true }))); }
    await sleep(1500);
    await point(`${wave} live bids`);
  }
}

writeFileSync(OUT, JSON.stringify(results, null, 2));
log("saved", OUT);
