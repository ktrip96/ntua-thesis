import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as lib from "./lib.mjs";
const { APP, SHOT_DIR, IMG, acceptTx, balance, bidExists, cancelTx, client, exec, fund, liveBidIdsOf, mint, owned, ownerOf, placeTx, rejectTx, bidIdOf } = lib;

const OUT = SHOT_DIR;
mkdirSync(OUT, { recursive: true });
const results = [];
const findings = [];
let page;
const errors = [];
const scenario = async (name, fn) => {
  try { const note = await fn(); results.push({ name, ok: true, note: note ?? "" }); console.log("PASS", name, note ? "— " + note : ""); }
  catch (e) { results.push({ name, ok: false, note: String(e.message ?? e).slice(0, 400) }); console.log("FAIL", name, "—", String(e.message ?? e).slice(0, 400)); await page?.screenshot({ path: `${OUT}/FAIL-${results.length}.png` }).catch(() => {}); }
};
const assert = (c, m) => { if (!c) throw new Error(m); };
const sdkBid = async (kp, ids, mist, target) => bidIdOf(await exec(kp, placeTx(ids, mist, target)));

const bob = new Ed25519Keypair(), carol = new Ed25519Keypair();
const B = bob.toSuiAddress(), C = carol.toSuiAddress();
await Promise.all([fund(B), fund(C)]);
const spec = (name, collection, rarity) => [name, `${name} description`, IMG[collection], collection, rarity];
const b = await mint(bob, [spec("Bob Sedan", "car", "common"), spec("Bob Coupe", "car", "uncommon"), spec("Bob Supercar", "car", "rare"), spec("Bob Cottage", "house", "common"), spec("Bob Mansion", "house", "rare"), spec("Bob Ticket", "tickets", "common")]);
const c = await mint(carol, [spec("Carol Pass", "tickets", "rare"), spec("Carol Townhouse", "house", "uncommon"), spec("Carol Sedan", "car", "common")]);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/slush|favicon|ERR_FAILED|ERR_NAME_NOT_RESOLVED/.test(m.text())) errors.push("CONSOLE " + m.text().slice(0, 200)); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const nav = async (name) => { await page.locator("header nav:visible").first().getByRole("link", { name, exact: true }).click(); await page.waitForTimeout(400); };
const toastWait = async (re, timeout = 60000) => { const t = page.getByText(re).first(); await t.waitFor({ timeout }); return t; };
const toastsGone = () => page.waitForTimeout(4000);
const balanceText = () => page.getByTitle(/Balance on/).textContent();
const openCollection = async (label) => { await nav("Marketplace"); await page.getByRole("link", { name: new RegExp(label, "i") }).first().click(); await page.waitForTimeout(600); };
const cardFor = (name) => page.locator("div.surface", { has: page.getByText(name, { exact: true }) }).first();
const bidCard = (text) => page.locator("div.surface", { has: page.getByText(text) }).first();
const expandCard = async (text) => { const card = bidCard(text); await card.waitFor({ timeout: 30000 }); const header = card.locator("[role=button][aria-expanded]"); if ((await header.getAttribute("aria-expanded")) !== "true") await header.click(); await page.waitForTimeout(300); return card; };
const settleQueries = () => page.waitForTimeout(1500);

await scenario("U0 disconnected: gates and marketplace browsing", async () => {
  await page.goto(APP + "/", { waitUntil: "networkidle" });
  await nav("Mint"); assert((await page.getByText("Mint free NFTs").count()) === 1, "mint gate");
  await nav("My NFTs"); assert((await page.getByText("Your NFTs live here").count()) === 1, "my nfts gate");
  await nav("My bids"); assert((await page.getByText("Your trades live here").count()) === 1, "my bids gate");
  await openCollection("Cars");
  assert((await page.getByText("Connect your wallet to place bids.").count()) === 1, "info banner");
  assert((await page.getByRole("button", { name: "Connect to bid" }).count()) >= 3, "cards show 'Connect to bid'");
  return "gates + 'Connect to bid' on every card";
});

let ME;
await scenario("U1 connect burner + faucet", async () => {
  await page.locator("header").getByRole("button", { name: /^connect/i }).first().click();
  await page.getByRole("button", { name: "Unsafe Burner Wallet" }).click();
  await page.waitForTimeout(1200);
  ME = (await page.evaluate(() => localStorage.getItem("mysten-dapp-kit:selected-wallet-and-address")))?.match(/0x[0-9a-f]{64}/)?.[0];
  if (!ME) { console.log("ABORT: burner not connected"); process.exit(1); }
  await page.getByRole("button", { name: /Faucet/ }).click();
  await toastWait(/Test SUI received/);
  await page.waitForTimeout(600);
  assert(/1000/.test(await balanceText()), "balance shows 1000 SUI: " + (await balanceText()));
  await toastsGone();
  return "balance " + (await balanceText());
});

await scenario("U2 mint: single, ×3, and queue", async () => {
  await nav("Mint");
  await page.getByRole("button", { name: /^Mint/ }).nth(0).click();
  await page.getByRole("button", { name: /^Mint/ }).nth(1).click();
  assert((await page.getByRole("button", { name: /Queued/ }).count()) === 1, "one queued card");
  await page.getByText("Minted", { exact: true }).first().waitFor({ timeout: 60000 });
  await page.waitForFunction(() => !/Queued|Minting…/.test(document.body.innerText), null, { timeout: 90000 });
  await toastsGone();
  const inc = page.getByRole("button", { name: "Increase quantity" }).nth(5);
  await inc.click(); await inc.click();
  await page.getByRole("button", { name: "Mint ×3" }).click();
  await toastWait(/Minted ×3/);
  await toastsGone();
  const mine = await owned(ME);
  const names = mine.map((o) => o.name).sort().join(", ");
  assert(mine.length === 5, "5 NFTs owned: " + names);
  return names;
});
let my = Object.fromEntries((await owned(ME)).map((o) => [o.id, o.name]));
const idByName = (n) => Object.entries(my).find(([, v]) => v === n)?.[0];
const mansions = Object.entries(my).filter(([, v]) => v === "Rare Mansion").map(([k]) => k);

await scenario("U3 collection: own cards say 'You own this', others 'Place a bid'", async () => {
  await openCollection("Cars");
  assert((await page.getByText("You own this").count()) === 2, "2 owned cars");
  const biddable = await page.getByRole("button", { name: "Place a bid" }).count();
  assert(biddable >= 4, "at least 4 biddable");
  return `2 owned, ${biddable} biddable`;
});

await scenario("U4a bid NFT-only via Skip (Common Sedan -> Bob Supercar)", async () => {
  await cardFor("Bob Supercar").getByRole("button", { name: "Place a bid" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("checkbox", { name: /Common Sedan/ }).click();
  await page.getByRole("button", { name: "Review trade" }).click();
  await page.getByRole("button", { name: "Place bid" }).click();
  await toastWait(/Bid placed/);
  await toastsGone();
  assert((await ownerOf(idByName("Common Sedan"))) !== ME, "sedan escrowed");
  return "escrowed";
});
await scenario("U4b bid SUI-only 0.5 (-> Bob Mansion)", async () => {
  await openCollection("Houses");
  const before = await balance(ME);
  await cardFor("Bob Mansion").getByRole("button", { name: "Place a bid" }).click();
  await page.getByRole("button", { name: "0.5 SUI" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  assert((await page.getByText("0.5 SUI", { exact: true }).count()) >= 1, "step 2 shows 0.5 SUI");
  const review = page.getByRole("button", { name: "Review trade" });
  assert(!(await review.isDisabled()), "Review enabled with SUI only");
  await review.click();
  await page.getByRole("button", { name: "Place bid" }).click();
  await toastWait(/Bid placed/); await toastsGone();
  const after = await balance(ME);
  assert(before - after >= 500_000_000n, "0.5 SUI left the wallet");
  return `balance -${(Number(before - after) / 1e9).toFixed(4)} SUI`;
});
await scenario("U4c bid NFT + SUI (Rare Mansion + 0.1 -> Bob Cottage)", async () => {
  await cardFor("Bob Cottage").getByRole("button", { name: "Place a bid" }).click();
  await page.getByLabel("SUI amount").fill("0.1");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: /Rare Mansion/ }).first().click();
  await page.getByRole("button", { name: "Review trade" }).click();
  await page.getByRole("button", { name: "Place bid" }).click();
  await toastWait(/Bid placed/); await toastsGone();
  return "ok";
});
await scenario("U4d validation: bad amount blocks Continue, Skip still works, close resets", async () => {
  await openCollection("Tickets");
  await cardFor("Bob Ticket").getByRole("button", { name: "Place a bid" }).click();
  await page.getByLabel("SUI amount").fill("abc");
  assert((await page.getByText("Enter a valid SUI amount").count()) === 1, "error shown");
  assert(await page.getByRole("button", { name: "Continue" }).isDisabled(), "Continue disabled");
  await page.getByLabel("SUI amount").fill("0");
  assert(await page.getByRole("button", { name: "Continue" }).isDisabled(), "Continue disabled for 0");
  await page.getByRole("button", { name: "Skip" }).click();
  assert((await page.getByText("Review trade").count()) === 1, "on step 2");
  assert(await page.getByRole("button", { name: "Review trade" }).isDisabled(), "Review disabled with nothing offered");
  await page.getByRole("button", { name: "Close" }).first().click();
  await page.waitForTimeout(400);
  await cardFor("Bob Ticket").getByRole("button", { name: "Place a bid" }).click();
  assert((await page.getByText("Add SUI to your offer").count()) === 1, "reopened at step 1");
  await page.getByRole("button", { name: "Close" }).first().click();
  return "ok";
});

await scenario("U5 My bids > Placed lists 3, expand shows give/get, cancel SUI-only bid refunds", async () => {
  await nav("My bids");
  await page.getByRole("tab", { name: /Placed/ }).click();
  await settleQueries();
  const rows = page.locator("[role=button][aria-expanded]");
  assert((await rows.count()) === 3, "3 placed rows, got " + (await rows.count()));
  const card = await expandCard("Bid on Bob Mansion");
  assert((await card.getByText("You give").count()) === 1 && (await card.getByText("You get").count()) === 1, "panels");
  const before = await balance(ME);
  await card.getByRole("button", { name: "Cancel bid" }).click();
  await toastWait(/Bid cancelled/); await toastsGone();
  await settleQueries();
  assert((await rows.count()) === 2, "2 rows after cancel");
  assert((await balance(ME)) - before >= 490_000_000n, "0.5 SUI refunded");
  return "refund ok";
});

await scenario("U6 My NFTs: 2 locked, dialog, link to My bids", async () => {
  await nav("My NFTs"); await settleQueries();
  assert((await page.getByText("In a bid").count()) === 2, "2 locked badges");
  assert(/3 in your wallet, 2 locked/.test(await page.getByText(/in your wallet/).textContent()), "meta");
  await page.getByText("In a bid").first().locator("xpath=ancestor::*[@role='button']").click();
  await page.getByRole("heading", { name: "Locked in your bid" }).waitFor();
  await page.getByRole("link", { name: "View in My bids" }).click();
  await page.waitForURL(/my-bids/);
  return "ok";
});

my = Object.fromEntries((await owned(ME)).map((o) => [o.id, o.name]));
const X = idByName("Uncommon Coupe"); const Y = mansions.find((id) => my[id]);
const bidBobX = await sdkBid(bob, [b["Bob Sedan"]], 0n, X);
const bidCarolX = await sdkBid(carol, [c["Carol Sedan"]], 250_000_000n, X);
const bidBobY = await sdkBid(bob, [b["Bob Coupe"]], 0n, Y);
await scenario("U7a Received tab shows 3 incoming; My NFTs badges 2 + 1", async () => {
  await nav("Mint"); await nav("My NFTs"); await settleQueries();
  assert((await page.getByText("2 bids", { exact: true }).count()) === 1, "coupe shows 2 bids");
  assert((await page.getByText("1 bid", { exact: true }).count()) === 1, "mansion shows 1 bid");
  await nav("My bids"); await settleQueries();
  assert(/3/.test(await page.getByRole("tab", { name: /Received/ }).textContent()), "received count 3");
  return "ok";
});
await scenario("U7b accept Bob's bid on Coupe from My NFTs; Carol's conflicting bid leaves my list but stays on chain", async () => {
  await nav("My NFTs"); await settleQueries();
  await page.getByText("2 bids", { exact: true }).locator("xpath=ancestor::*[@role='button']").click();
  await page.getByRole("heading", { name: "Incoming bids" }).waitFor();
  const bobRow = page.locator("div.rounded-\\[14px\\]", { hasText: B.slice(0, 6) }).first();
  await bobRow.getByRole("button", { name: "Accept trade" }).click();
  await toastWait(/Trade complete/); await toastsGone(); await settleQueries();
  assert((await ownerOf(X)) === B, "coupe went to bob");
  assert((await ownerOf(b["Bob Sedan"])) === ME, "bob sedan arrived");
  assert(await bidExists(bidCarolX), "carol's bid still on chain");
  await nav("My bids"); await settleQueries();
  assert(/1/.test(await page.getByRole("tab", { name: /Received/ }).textContent()), "received now 1");
  return "conflicting bid follows the NFT";
});
await scenario("U7c reject Bob's bid on Mansion from My bids > Received", async () => {
  await page.getByRole("tab", { name: /Received/ }).click();
  const card = await expandCard("targeting Rare Mansion");
  await card.getByRole("button", { name: "Reject", exact: true }).click();
  await toastWait(/Bid rejected/); await toastsGone(); await settleQueries();
  assert((await ownerOf(Y)) === ME, "mansion still mine");
  assert((await ownerOf(b["Bob Coupe"])) === B, "bob coupe back to bob");
  assert(!(await bidExists(bidBobY)), "bid gone");
  assert((await page.getByText("No bids received yet").count()) === 1, "empty state");
  return "ok";
});

const placed = await liveBidIdsOf(ME);
await scenario("U8a Bob accepts my NFT-only bid: My bids updates, Supercar arrives, Sedan gone", async () => {
  const withTargets = await Promise.all(placed.map(async (id) => ({ id, json: (await client.core.getObject({ objectId: id, include: { json: true } })).object.json })));
  const supercarBid = withTargets.find((x) => x.json.target_nft_id === b["Bob Supercar"]).id;
  await exec(bob, acceptTx(supercarBid, [b["Bob Supercar"]]));
  await nav("My NFTs"); await settleQueries();
  assert((await page.getByText("Bob Supercar").count()) === 1, "supercar shown");
  assert((await page.getByText("In a bid").count()) === 1, "only mansion still locked");
  await nav("My bids"); await page.getByRole("tab", { name: /Placed/ }).click(); await settleQueries();
  assert((await page.locator("[role=button][aria-expanded]").count()) === 1, "1 placed left");
  return "ok";
});
await scenario("U8b Bob rejects my NFT+SUI bid: Mansion and 0.1 SUI come back", async () => {
  const [cottageBid] = await liveBidIdsOf(ME);
  const before = await balance(ME);
  await exec(bob, rejectTx(cottageBid, b["Bob Cottage"]));
  await nav("My NFTs"); await settleQueries();
  assert((await page.getByText("In a bid").count()) === 0, "nothing locked");
  assert((await balance(ME)) - before === 100_000_000n, "0.1 SUI refunded exactly");
  await nav("My bids"); await page.getByRole("tab", { name: /Placed/ }).click(); await settleQueries();
  assert((await page.getByText("You haven't placed any bids yet").count()) === 1, "placed empty");
  return "ok";
});

await scenario("U9 stale incoming bid (cancelled by bidder while on screen): Accept shows a failure toast", async () => {
  const stale = await sdkBid(carol, [c["Carol Pass"]], 0n, Y);
  findings.push("Lists do not poll: a bid placed while you sit on My bids only appears after navigating away and back.");
  await nav("My NFTs"); await nav("My bids"); await page.getByRole("tab", { name: /Received/ }).click();
  await bidCard("targeting Rare Mansion").waitFor({ timeout: 30000 });
  await exec(carol, cancelTx(stale));
  const card = await expandCard("targeting Rare Mansion");
  await card.getByRole("button", { name: "Accept trade" }).click();
  await toastWait(/Accept failed/, 30000);
  const desc = await page.locator("[data-sonner-toast]").first().textContent();
  findings.push("Stale-bid toast text: " + desc);
  await toastsGone();
  return desc.slice(0, 120);
});

await scenario("U10 mobile 390px: nav, mint chips, My NFTs sheet, bid flow steps", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nav("Mint"); await page.waitForTimeout(400);
  assert((await page.getByRole("button", { name: "Houses" }).count()) === 1, "collection chips");
  await nav("My NFTs"); await settleQueries();
  await page.locator("[role=button]").filter({ hasText: "Rare Mansion" }).first().click();
  await page.getByRole("heading", { name: "Incoming bids" }).waitFor();
  await page.keyboard.press("Escape");
  await openCollection("Houses");
  await cardFor("Carol Townhouse").getByRole("button", { name: "Place a bid" }).click();
  assert((await page.getByLabel(/Step 1 of 3/).count()) === 1, "step dots");
  await page.getByRole("button", { name: "Skip" }).click();
  assert((await page.getByLabel(/Step 2 of 3/).count()) === 1, "step 2 dots");
  await page.getByRole("button", { name: "Back" }).click();
  assert((await page.getByLabel(/Step 1 of 3/).count()) === 1, "back works");
  await page.getByRole("button", { name: "Close" }).first().click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert(!overflow, "no horizontal overflow");
  return "ok";
});

console.log("\n==== SUMMARY ====");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
const passed = results.filter((r) => r.ok).length;
console.log(`${passed}/${results.length} passed`);
console.log("FINDINGS:\n" + (findings.join("\n") || "none"));
console.log("BROWSER ERRORS:\n" + (errors.join("\n") || "none"));
await browser.close();
process.exit(passed === results.length ? 0 : 1);
