import { readFileSync } from "node:fs";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";

export const NETWORK = process.env.NETWORK ?? "localnet";
if (!["localnet", "devnet", "testnet"].includes(NETWORK)) throw new Error(`NETWORK must be localnet, devnet or testnet (got ${NETWORK})`);

function packageIdFor(network) {
  const toml = readFileSync(new URL("../../Published.toml", import.meta.url), "utf8");
  const block = toml.split(/^\[/m).find((b) => b.startsWith(`published.${network}]`));
  const fromToml = block?.match(/published-at = "(0x[0-9a-f]+)"/)?.[1];
  if (fromToml) return fromToml;
  if (network === "localnet") return readFileSync(new URL("../.env", import.meta.url), "utf8").match(/VITE_PACKAGE_ID=(0x[0-9a-f]+)/)[1];
  throw new Error(`No [published.${network}] entry in Published.toml; publish the package there first`);
}

export const PACKAGE_ID = process.env.PACKAGE_ID ?? packageIdFor(NETWORK);
export const NFT = `${PACKAGE_ID}::marketplace_nft::MarketplaceNFT`;
export const COIN = "0x2::coin::Coin<0x2::sui::SUI>";
export const BID_PLACED = `${PACKAGE_ID}::barter::BidPlaced`;
export const APP = process.env.APP_URL ?? "http://localhost:5174";
export const FAUCET = getFaucetHost(NETWORK);
export const client = NETWORK === "localnet"
  ? new SuiJsonRpcClient({ network: "localnet", url: "http://127.0.0.1:9000" })
  : new SuiGrpcClient({ network: NETWORK, baseUrl: `https://fullnode.${NETWORK}.sui.io:443` });
export const THESIS_FIGURES = new URL("../../Thesis/latex/figures/", import.meta.url).pathname;
export const SHOT_DIR = new URL("../../.verify-shots/", import.meta.url).pathname;

const U = "?w=600&h=600&fit=crop";
export const CATALOG = {
  "Common Sedan": ["A reliable everyday sedan.", `https://images.unsplash.com/photo-1494976388531-d1058494cdd8${U}`, "car", "common"],
  "Uncommon Coupe": ["A sleek coupe for the discerning driver.", `https://images.unsplash.com/photo-1503376780353-7e6692767b70${U}`, "car", "uncommon"],
  "Rare Supercar": ["A one-of-a-kind supercar.", `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7${U}`, "car", "rare"],
  "Common Cottage": ["A cozy starter cottage.", `https://images.unsplash.com/photo-1568605114967-8130f3a36994${U}`, "house", "common"],
  "Uncommon Townhouse": ["A spacious townhouse in a great neighborhood.", `https://images.unsplash.com/photo-1564013799919-ab600027ffc6${U}`, "house", "uncommon"],
  "Rare Mansion": ["A sprawling luxury mansion.", `https://images.unsplash.com/photo-1613490493576-7fde63acd811${U}`, "house", "rare"],
  "Common Movie Ticket": ["Admission for one to a regular screening.", `https://images.unsplash.com/photo-1499364615650-ec38552f4f34${U}`, "tickets", "common"],
  "Uncommon Concert Ticket": ["General admission to a sold-out show.", `https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3${U}`, "tickets", "uncommon"],
  "Rare VIP Festival Pass": ["Backstage VIP access to a multi-day festival.", `https://images.unsplash.com/photo-1507676184212-d03ab07a01bf${U}`, "tickets", "rare"],
};
export const IMG = { car: CATALOG["Common Sedan"][1], house: CATALOG["Common Cottage"][1], tickets: CATALOG["Common Movie Ticket"][1] };

export const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export async function fund(address) {
  await requestSuiFromFaucetV2({ host: FAUCET, recipient: address });
  for (let i = 0; i < 80; i++) {
    if (BigInt((await client.core.getBalance({ owner: address })).balance.balance) > 0n) return;
    await sleep(400);
  }
  throw new Error("faucet did not fund " + address);
}

export async function exec(signer, tx, { noWait = false } = {}) {
  tx.setSenderIfNotSet(signer.toSuiAddress());
  const r = await client.core.signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true, events: true } });
  if (r.$kind === "FailedTransaction") throw new Error("FailedTransaction: " + (r.FailedTransaction.status.error?.message ?? JSON.stringify(r.FailedTransaction.status)));
  if (!noWait) await client.core.waitForTransaction({ digest: r.Transaction.digest });
  return r.Transaction;
}

export async function owned(address) {
  const out = [];
  let cursor = null;
  do {
    const page = await client.core.listOwnedObjects({ owner: address, type: NFT, include: { json: true }, cursor });
    out.push(...page.objects.map((o) => ({ id: o.objectId, name: o.json?.name })));
    cursor = page.hasNextPage ? page.cursor : null;
  } while (cursor);
  return out;
}

export const balance = async (address) => BigInt((await client.core.getBalance({ owner: address })).balance.balance);
export const ownerOf = async (id) => { const o = await client.core.getObject({ objectId: id }); return o.object.owner.AddressOwner ?? o.object.owner.$kind; };
export const bidExists = async (id) => { try { return !!(await client.core.getObject({ objectId: id })).object; } catch { return false; } };
export const bidIdOf = (t) => t.events?.find((e) => e.eventType.endsWith("::BidPlaced"))?.json.bid_id;

export function mintTx(specs, recipient) {
  const tx = new Transaction();
  const minted = specs.map((spec) => {
    const [name, description, image, collection, rarity] = typeof spec === "string"
      ? [spec, ...(CATALOG[spec] ?? ["Verification asset", IMG.car, "car", "common"])]
      : spec;
    return tx.moveCall({ target: `${PACKAGE_ID}::marketplace_nft::mint`, arguments: [name, description, image, collection, rarity].map((s) => tx.pure.string(s)) });
  });
  tx.transferObjects(minted, recipient);
  return tx;
}

export async function mint(kp, specs) {
  const before = new Set((await owned(kp.toSuiAddress())).map((o) => o.id));
  await exec(kp, mintTx(specs, kp.toSuiAddress()));
  const fresh = (await owned(kp.toSuiAddress())).filter((o) => !before.has(o.id));
  const used = new Set();
  return Object.fromEntries(specs.map((spec) => {
    const name = typeof spec === "string" ? spec : spec[0];
    const hit = fresh.find((o) => o.name === name && !used.has(o.id));
    used.add(hit?.id);
    return [name, hit?.id];
  }));
}

export function placeTx(offeredIds, mist, targetId, { requested = 1, types = [NFT, NFT], offeredType = NFT } = {}) {
  const tx = new Transaction();
  const vec = tx.makeMoveVec({ type: offeredType, elements: offeredIds.map((id) => tx.object(id)) });
  const [coin] = tx.splitCoins(tx.gas, [mist]);
  tx.moveCall({ target: `${PACKAGE_ID}::barter::place_bid`, typeArguments: types, arguments: [vec, coin, tx.pure.u64(requested), tx.pure.option("id", targetId)] });
  return tx;
}

export async function place(kp, offeredIds, mist, targetId, opts) {
  return bidIdOf(await exec(kp, placeTx(offeredIds, mist, targetId, opts)));
}

export function acceptTx(bidId, counterIds, { types = [NFT, NFT], counterType = NFT } = {}) {
  const tx = new Transaction();
  const vec = tx.makeMoveVec({ type: counterType, elements: counterIds.map((id) => tx.object(id)) });
  tx.moveCall({ target: `${PACKAGE_ID}::barter::accept_bid`, typeArguments: types, arguments: [tx.object(bidId), vec] });
  return tx;
}

export function cancelTx(bidId) {
  const tx = new Transaction();
  tx.moveCall({ target: `${PACKAGE_ID}::barter::cancel_bid`, typeArguments: [NFT, NFT], arguments: [tx.object(bidId)] });
  return tx;
}

export function rejectTx(bidId, nftId) {
  const tx = new Transaction();
  tx.moveCall({ target: `${PACKAGE_ID}::barter::reject_bid`, typeArguments: [NFT, NFT], arguments: [tx.object(bidId), tx.object(nftId)] });
  return tx;
}

export async function liveBidIdsOf(address) {
  const events = [];
  let before = null;
  while (true) {
    const page = await client.core.listEvents({ filter: { eventType: BID_PLACED }, order: "descending", before });
    events.push(...page.events);
    if (!page.hasNextPage || !page.endCursor) break;
    before = page.endCursor;
  }
  const ids = events.filter((e) => e.sender === address).map((e) => e.json.bid_id);
  const live = [];
  for (const id of ids) if (await bidExists(id)) live.push(id);
  return live;
}
