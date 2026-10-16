import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { COIN, NFT, PACKAGE_ID, acceptTx, balance, bidExists, cancelTx, client, exec, fund, mint, owned, ownerOf, place, rejectTx } from "./lib.mjs";

const results = [];
const scenario = async (name, fn) => {
  try { const note = await fn(); results.push({ name, ok: true, note: note ?? "" }); }
  catch (e) { results.push({ name, ok: false, note: String(e.message ?? e).slice(0, 300) }); }
};
const assert = (cond, msg) => { if (!cond) throw new Error("assertion failed: " + msg); };
const expectAbort = (err, code) => {
  const m = String(err.message ?? err);
  if (!new RegExp(`abort code: ${code}\\b`).test(m)) throw new Error(`expected abort ${code}, got: ${m.slice(0, 200)}`);
  return `aborted with code ${code} as expected`;
};

const alice = new Ed25519Keypair(), bob = new Ed25519Keypair(), carol = new Ed25519Keypair();
const A = alice.toSuiAddress(), B = bob.toSuiAddress(), C = carol.toSuiAddress();
await Promise.all([fund(A), fund(B), fund(C)]);
const a = await mint(alice, ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"]);
const b = await mint(bob, ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"]);
const c = await mint(carol, ["C1", "C2", "C3"]);

await scenario("place_bid: NFTs only, targeted", async () => {
  const id = await place(alice, [a.A1, a.A2], 0n, b.B1);
  assert((await ownerOf(a.A1)) !== A, "A1 left alice's wallet");
  const o = await client.core.getObject({ objectId: id, include: { json: true } });
  assert(o.object.owner.$kind === "Shared", "bid is shared");
  assert(o.object.json.offered_count === "2", "offered_count 2");
  await exec(alice, cancelTx(id));
  assert((await ownerOf(a.A1)) === A && (await ownerOf(a.A2)) === A, "both back after cancel");
  return "escrowed as DOFs, shared object, cancel returns both";
});
await scenario("place_bid: SUI only", async () => {
  const id = await place(alice, [], 1_000_000_000n, b.B1);
  const o = await client.core.getObject({ objectId: id, include: { json: true } });
  assert(o.object.json.offered_sui === "1000000000", "offered_sui 1 SUI");
  await exec(alice, cancelTx(id));
  return "1 SUI escrowed, returned on cancel";
});
await scenario("place_bid: NFTs + SUI", async () => {
  const id = await place(alice, [a.A3], 500_000_000n, b.B1);
  await exec(alice, cancelTx(id));
  return "ok";
});
await scenario("place_bid: nothing offered -> EEmptyBid (3)", async () => {
  try { await place(alice, [], 0n, b.B1); throw new Error("should have aborted"); } catch (e) { return expectAbort(e, 3); }
});
await scenario("place_bid: requested_count 0 -> EInvalidRequestedCount (4)", async () => {
  try { await place(alice, [a.A3], 0n, b.B1, { requested: 0 }); throw new Error("should have aborted"); } catch (e) { return expectAbort(e, 4); }
});
await scenario("untargeted bid: anyone with an NFT of type R can accept", async () => {
  const id = await place(alice, [a.A3], 0n, null);
  await exec(carol, acceptTx(id, [c.C1]));
  assert((await ownerOf(a.A3)) === C, "carol got A3");
  assert((await ownerOf(c.C1)) === A, "alice got C1");
  assert(!(await bidExists(id)), "bid deleted");
  return "carol accepted with C1; swap atomic; bid deleted";
});
await scenario("accept_bid: correct target, SUI goes to acceptor", async () => {
  const before = await balance(B);
  const id = await place(alice, [a.A4], 2_000_000_000n, b.B1);
  const t = await exec(bob, acceptTx(id, [b.B1]));
  const after = await balance(B);
  assert((await ownerOf(a.A4)) === B && (await ownerOf(b.B1)) === A, "NFTs swapped");
  assert(after - before > 1_900_000_000n, `bob net +${after - before} MIST`);
  assert(t.events.some((e) => e.eventType.endsWith("::BidAccepted")), "BidAccepted emitted");
  return `swap + 2 SUI payout; bob net ${(Number(after - before) / 1e9).toFixed(4)} SUI`;
});
await scenario("accept_bid: wrong NFT for targeted bid -> ETargetNftNotProvided (2)", async () => {
  const id = await place(alice, [a.A5], 0n, b.B2);
  try { await exec(bob, acceptTx(id, [b.B3])); throw new Error("should have aborted"); } catch (e) { const r = expectAbort(e, 2); await exec(alice, cancelTx(id)); return r; }
});
await scenario("accept_bid: 2 NFTs when 1 requested -> EInvalidCounterCount (1)", async () => {
  const id = await place(alice, [a.A5], 0n, b.B2);
  try { await exec(bob, acceptTx(id, [b.B2, b.B3])); throw new Error("should have aborted"); } catch (e) { const r = expectAbort(e, 1); await exec(alice, cancelTx(id)); return r; }
});
await scenario("requested_count 2: target + one more of type R", async () => {
  const id = await place(alice, [a.A5], 0n, b.B2, { requested: 2 });
  await exec(bob, acceptTx(id, [b.B3, b.B2]));
  assert((await ownerOf(b.B2)) === A && (await ownerOf(b.B3)) === A && (await ownerOf(a.A5)) === B, "2-for-1 swap");
  return "alice received B2+B3 for A5";
});
await scenario("conflicting bids: two bids on B4, accept one, the other follows the NFT", async () => {
  const bid1 = await place(alice, [a.A6], 0n, b.B4);
  const bid2 = await place(carol, [c.C2], 0n, b.B4);
  await exec(bob, acceptTx(bid1, [b.B4]));
  assert((await ownerOf(b.B4)) === A, "B4 now alice's");
  let bobBlocked = false;
  try { await exec(bob, rejectTx(bid2, b.B4)); } catch { bobBlocked = true; }
  assert(bobBlocked, "bob cannot reject bid2 any more");
  await exec(alice, acceptTx(bid2, [b.B4]));
  assert((await ownerOf(b.B4)) === C && (await ownerOf(c.C2)) === A, "alice accepted carol's bid with B4");
  return "bid2 stayed valid; old owner blocked; new owner accepted it";
});
await scenario("accept_bid on an already-consumed bid fails", async () => {
  const id = await place(alice, [a.A7], 0n, b.B5);
  await exec(bob, acceptTx(id, [b.B5]));
  try { await exec(bob, acceptTx(id, [b.B5])); throw new Error("should have failed"); } catch (e) { assert(!/should have/.test(e.message), "second accept rejected"); return "second accept rejected: " + e.message.slice(0, 90); }
});
await scenario("cancel_bid by non-bidder -> ENotBidder (0); by bidder ok", async () => {
  const id = await place(alice, [a.A8], 300_000_000n, b.B6);
  let r;
  try { await exec(bob, cancelTx(id)); throw new Error("should have aborted"); } catch (e) { r = expectAbort(e, 0); }
  const before = await balance(A);
  await exec(alice, cancelTx(id));
  assert((await ownerOf(a.A8)) === A, "A8 back");
  assert((await balance(A)) - before > 250_000_000n, "0.3 SUI returned (minus gas)");
  return r + "; bidder cancel returned NFT and SUI";
});
await scenario("reject_bid by target owner returns assets; wrong NFT -> ENotTargetNftOwner (6)", async () => {
  const id = await place(alice, [a.A8], 200_000_000n, b.B6);
  let r;
  try { await exec(bob, rejectTx(id, b.B7)); throw new Error("should have aborted"); } catch (e) { r = expectAbort(e, 6); }
  const before = await balance(A);
  const t = await exec(bob, rejectTx(id, b.B6));
  assert((await ownerOf(a.A8)) === A, "A8 back to alice");
  assert((await balance(A)) - before >= 200_000_000n, "0.2 SUI back to alice");
  assert(t.events.some((e) => e.eventType.endsWith("::BidRejected")), "BidRejected emitted");
  return r + "; reject returned NFT and SUI to bidder";
});
await scenario("reject_bid on untargeted bid -> EBidNotTargeted (5)", async () => {
  const id = await place(alice, [a.A8], 0n, null);
  try { await exec(bob, rejectTx(id, b.B6)); throw new Error("should have aborted"); } catch (e) { const r = expectAbort(e, 5); await exec(alice, cancelTx(id)); return r; }
});
await scenario("race: bob and carol accept the same untargeted bid simultaneously -> exactly one wins", async () => {
  const id = await place(alice, [a.A8], 0n, null);
  const [rb, rc] = await Promise.allSettled([exec(bob, acceptTx(id, [b.B7])), exec(carol, acceptTx(id, [c.C3]))]);
  const wins = [rb, rc].filter((r) => r.status === "fulfilled").length;
  assert(wins === 1, `exactly one success, got ${wins}`);
  assert(!(await bidExists(id)), "bid gone");
  const loser = [rb, rc].find((r) => r.status === "rejected");
  return `${rb.status === "fulfilled" ? "bob" : "carol"} won; loser failed with: ${loser.reason.message.slice(0, 80)}`;
});
await scenario("target NFT locked in another bid: bid cannot be accepted/rejected until released; cancel works", async () => {
  const bobBid = await place(bob, [b.B8], 0n, null);
  const aliceBid = await place(alice, [a.A9], 0n, b.B8);
  let blocked = false;
  try { await exec(bob, acceptTx(aliceBid, [b.B8])); } catch { blocked = true; }
  assert(blocked, "bob cannot use escrowed B8");
  await exec(bob, cancelTx(bobBid));
  await exec(bob, acceptTx(aliceBid, [b.B8]));
  assert((await ownerOf(a.A9)) === B, "after release, accept works");
  return "stuck while escrowed, works after bob cancelled his own bid";
});
await scenario("bidder accepts their own bid (self-trade) is allowed and harmless", async () => {
  const id = await place(alice, [a.A10], 100_000_000n, null);
  const other = (await owned(A)).find((o) => o.id !== a.A10);
  await exec(alice, acceptTx(id, [other.id]));
  assert((await ownerOf(a.A10)) === A && (await ownerOf(other.id)) === A, "everything back with alice");
  return "allowed; all assets and SUI end up back with alice";
});
await scenario("cross-type generics: Bid<MarketplaceNFT, Coin<SUI>> accepted with a coin object", async () => {
  const fresh = await mint(alice, ["X1"]);
  const id = await place(alice, [fresh.X1], 0n, null, { types: [NFT, COIN] });
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [1_000_000_000n]);
  const vec = tx.makeMoveVec({ type: COIN, elements: [coin] });
  tx.moveCall({ target: `${PACKAGE_ID}::barter::accept_bid`, typeArguments: [NFT, COIN], arguments: [tx.object(id), vec] });
  const before = await balance(A);
  await exec(bob, tx);
  assert((await ownerOf(fresh.X1)) === B, "bob got the NFT");
  assert((await balance(A)) - before === 1_000_000_000n, "alice got exactly 1 SUI");
  return "NFT-for-coin swap via generics, no contract change";
});
await scenario("accept_bid with mismatched type arguments is rejected by the VM", async () => {
  const fresh = await mint(alice, ["X2"]);
  const id = await place(alice, [fresh.X2], 0n, null);
  const bobsNft = (await owned(B))[0].id;
  try { await exec(bob, acceptTx(id, [bobsNft], { types: [NFT, COIN], counterType: NFT })); throw new Error("should have failed"); }
  catch (e) { assert(!/should have|correct sender/.test(e.message), "failure is about types: " + e.message.slice(0, 120)); await exec(alice, cancelTx(id)); return "rejected: " + e.message.slice(0, 120); }
});

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.note ? "\n        " + r.note : ""}`);
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
