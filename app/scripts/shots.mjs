import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { requestSuiFromFaucetV2 } from "@mysten/sui/faucet";

const APP = process.env.APP_URL ?? "http://localhost:5174";
const OUT = new URL("../../Thesis/latex/figures/shots", import.meta.url).pathname;
const PACKAGE_ID = readFileSync(new URL("../.env", import.meta.url), "utf8").match(/VITE_PACKAGE_ID=(0x[0-9a-f]+)/)[1];
const NFT = `${PACKAGE_ID}::marketplace_nft::MarketplaceNFT`;
const client = new SuiJsonRpcClient({ network: "localnet", url: "http://127.0.0.1:9000" });
const U = "?w=600&h=600&fit=crop";
const CAT = {
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
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
async function fund(a) { await requestSuiFromFaucetV2({ host: "http://127.0.0.1:9123", recipient: a }); for (let i = 0; i < 60; i++) { if (BigInt((await client.core.getBalance({ owner: a })).balance.balance) > 0n) return; await new Promise(r => setTimeout(r, 400)); } throw new Error("faucet"); }
async function exec(kp, tx) { tx.setSenderIfNotSet(kp.toSuiAddress()); const r = await client.core.signAndExecuteTransaction({ transaction: tx, signer: kp, include: { events: true } }); if (r.$kind === "FailedTransaction") throw new Error(r.FailedTransaction.status.error?.message); await client.core.waitForTransaction({ digest: r.Transaction.digest }); return r.Transaction; }
async function owned(a) { const { objects } = await client.core.listOwnedObjects({ owner: a, type: NFT, include: { json: true } }); return objects.map(o => ({ id: o.objectId, name: o.json?.name })); }
function mintTx(names, to) { const tx = new Transaction(); const m = names.map(n => { const [d, img, c, r] = CAT[n]; return tx.moveCall({ target: `${PACKAGE_ID}::marketplace_nft::mint`, arguments: [n, d, img, c, r].map(s => tx.pure.string(s)) }); }); tx.transferObjects(m, to); return tx; }
function bidTx(ids, mist, target) { const tx = new Transaction(); const v = tx.makeMoveVec({ type: NFT, elements: ids.map(id => tx.object(id)) }); const [c] = tx.splitCoins(tx.gas, [mist]); tx.moveCall({ target: `${PACKAGE_ID}::barter::place_bid`, typeArguments: [NFT, NFT], arguments: [v, c, tx.pure.u64(1), tx.pure.option("id", target)] }); return tx; }
const idOf = (list, name) => list.find(n => n.name === name)?.id;

const bob = new Ed25519Keypair(), carol = new Ed25519Keypair();
const B = bob.toSuiAddress(), C = carol.toSuiAddress();
await fund(B); await fund(C);
await exec(bob, mintTx(["Rare Supercar", "Uncommon Coupe", "Common Sedan", "Rare VIP Festival Pass", "Uncommon Concert Ticket"], B));
await exec(carol, mintTx(["Common Cottage", "Uncommon Concert Ticket", "Rare Supercar", "Uncommon Coupe"], C));
log("counterparties ready");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", e => errors.push(e.message));
const imagesLoaded = () => page.waitForFunction(() => Array.from(document.images).every(i => i.complete), null, { timeout: 30000 }).catch(() => log("images pending"));
const settle = async (ms = 600) => { await imagesLoaded(); await page.waitForTimeout(ms); };
const shot = async (name, full = false) => { if (!KEEP_TOAST.has(name)) await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {}); await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 90, fullPage: full }); log("shot", name); };
const nav = async (name) => { await page.locator("header nav:visible").getByRole("link", { name, exact: true }).click(); await page.waitForTimeout(400); };
const toast = async (re) => { await page.getByText(re).first().waitFor({ timeout: 60000 }); };
const toastsGone = async () => { await page.waitForTimeout(3800); await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {}); await page.waitForTimeout(300); };
const KEEP_TOAST = new Set(["05-mint-toast", "13-bid-placed-toast", "17-accepting", "18-trade-complete", "19-bid-rejected", "20-bid-cancelled"]);
const card = (name) => page.locator("div.surface", { has: page.getByText(name, { exact: true }) }).first();
const bidCard = (text) => page.locator("div.surface", { has: page.getByText(text) }).first();

await page.goto(APP + "/", { waitUntil: "networkidle" }); await settle(1200);
await shot("01-home-disconnected");
await page.locator("header").getByRole("button", { name: /^connect/i }).click();
await page.getByRole("button", { name: "Unsafe Burner Wallet" }).waitFor(); await page.waitForTimeout(600);
await shot("02-connect-modal");
await page.getByRole("button", { name: "Unsafe Burner Wallet" }).click(); await page.waitForTimeout(1200);
const ME = (await page.evaluate(() => localStorage.getItem("mysten-dapp-kit:selected-wallet-and-address")))?.match(/0x[0-9a-f]{64}/)?.[0];
await page.getByRole("button", { name: /Faucet/ }).click(); await toast(/Test SUI received/); await toastsGone(); await settle(400);
await shot("08-home-connected");

await nav("Mint"); await settle(800);
await shot("03-mint");
const mintBtn = (name) => card(name).getByRole("button", { name: /^Mint/ });
await mintBtn("Common Sedan").click(); await page.waitForTimeout(150);
await shot("04-mint-pending");
await toast(/^Minted$/); await page.waitForTimeout(400);
await shot("05-mint-toast");
await toastsGone();
for (const n of ["Uncommon Townhouse", "Rare Mansion", "Common Cottage"]) { await mintBtn(n).click(); await toast(/^Minted$/); await toastsGone(); }
const mine = await owned(ME);
log("mine:", mine.map(n => n.name).join(", "));

await nav("Marketplace"); await page.getByRole("link", { name: /Cars/i }).first().click(); await settle(1000);
await shot("09-collection");

const bobs = await owned(B);
await card("Rare Supercar").getByRole("button", { name: "Place a bid" }).first().click(); await page.waitForTimeout(500);
await page.getByLabel("SUI amount").fill("1.5"); await page.waitForTimeout(300);
await shot("10-bid-step1");
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(500);
await page.getByRole("checkbox", { name: /Uncommon Townhouse/ }).click();
await page.getByRole("checkbox", { name: /Common Sedan/ }).click(); await settle(400);
await shot("11-bid-step2");
await page.getByRole("button", { name: "Review trade" }).click(); await settle(500);
await shot("12-bid-step3");
await page.getByRole("button", { name: "Place bid" }).click(); await toast(/Bid placed/); await page.waitForTimeout(500);
await shot("13-bid-placed-toast");
await toastsGone();
await nav("My bids"); await page.getByRole("tab", { name: /Placed/ }).click(); await bidCard("Bid on Rare Supercar").waitFor({ timeout: 30000 }); await settle(500);
await shot("14-my-bids-placed");

const mansion = idOf(mine, "Rare Mansion"), cottage = idOf(mine, "Common Cottage");
await exec(bob, bidTx([idOf(bobs, "Uncommon Coupe")], 500_000_000n, mansion));
const carols = await owned(C);
await exec(carol, bidTx([idOf(carols, "Rare Supercar")], 0n, mansion));
await exec(bob, bidTx([idOf(bobs, "Rare VIP Festival Pass")], 0n, cottage));
await nav("My NFTs"); await page.getByText("2 bids", { exact: true }).waitFor({ timeout: 30000 }); await settle(600);
await shot("06-my-nfts");
await page.getByText("2 bids", { exact: true }).locator("xpath=ancestor::*[@role='button']").click();
await page.getByRole("heading", { name: "Incoming bids" }).waitFor(); await settle(600);
await shot("07-incoming-bids");
await page.keyboard.press("Escape"); await page.waitForTimeout(400);

await nav("My bids"); await page.getByRole("tab", { name: /Received/ }).click();
const mansionRow = bidCard("targeting Rare Mansion"); await mansionRow.waitFor({ timeout: 30000 });
const bobRow = page.locator("div.surface", { has: page.getByText(/0\.5 SUI/) }).first();
await bobRow.locator("[role=button][aria-expanded]").click(); await settle(500);
await shot("16-my-bids-received-expanded");
await bobRow.getByRole("button", { name: "Accept trade" }).click(); await page.waitForTimeout(120);
await shot("17-accepting");
await toast(/Trade complete/); await page.waitForTimeout(500);
await shot("18-trade-complete");
await toastsGone();

const cottageRow = bidCard("targeting Common Cottage"); await cottageRow.waitFor({ timeout: 30000 });
await cottageRow.locator("[role=button][aria-expanded]").click(); await page.waitForTimeout(300);
await cottageRow.getByRole("button", { name: "Reject", exact: true }).click(); await toast(/Bid rejected/); await page.waitForTimeout(500);
await shot("19-bid-rejected");
await toastsGone();

await page.getByRole("tab", { name: /Placed/ }).click();
const myBid = bidCard("Bid on Rare Supercar"); await myBid.waitFor({ timeout: 30000 });
await myBid.locator("[role=button][aria-expanded]").click(); await page.waitForTimeout(300);
await myBid.getByRole("button", { name: "Cancel bid" }).click(); await toast(/Bid cancelled/); await page.waitForTimeout(500);
await shot("20-bid-cancelled");
await toastsGone();

const carols2 = await owned(C);
await exec(carol, bidTx([idOf(carols2, "Uncommon Coupe")], 250_000_000n, cottage));
await page.setViewportSize({ width: 390, height: 844 });
await nav("Marketplace"); await settle(900); await shot("m1-home");
await page.getByRole("link", { name: /Cars/i }).first().click(); await settle(900); await shot("m2-collection");
await page.getByRole("button", { name: "Place a bid" }).first().click(); await page.waitForTimeout(500);
await page.getByRole("button", { name: "Skip" }).click(); await page.waitForTimeout(400);
await page.getByRole("checkbox").first().click();
await page.getByRole("button", { name: "Review trade" }).click(); await settle(500); await shot("m5-bid-review");
await page.getByRole("button", { name: "Back" }).click(); await page.waitForTimeout(200);
await page.getByRole("button", { name: "Back" }).click(); await page.waitForTimeout(200);
await page.getByRole("button", { name: "Close" }).first().click(); await page.waitForTimeout(400);
await nav("Mint"); await settle(900); await shot("m6-mint");
await nav("My NFTs"); await page.getByText("1 bid", { exact: true }).waitFor({ timeout: 30000 }); await settle(500);
await page.getByText("1 bid", { exact: true }).locator("xpath=ancestor::*[@role='button']").click();
await page.getByRole("heading", { name: "Incoming bids" }).waitFor(); await settle(600); await shot("m8-incoming-bids");
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
await nav("My bids"); await page.getByRole("tab", { name: /Received/ }).click(); await bidCard("targeting Common Cottage").waitFor({ timeout: 30000 }); await settle(500); await shot("m9-my-bids");

log("errors:", errors.join(" | ") || "none");
await browser.close();
