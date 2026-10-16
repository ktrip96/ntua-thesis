import type { ClientWithCoreApi, SuiClientTypes } from "@mysten/sui/client";
import { parseOfferedSui, parseOptionalId } from "@/lib/bidFields";
import type { BidObject, MarketplaceNFT } from "@/types";

export interface EnrichedBid {
  bid: BidObject;
  targetNft: MarketplaceNFT | null;
  offeredNfts: MarketplaceNFT[];
}

export const OBJECT_INCLUDE = { json: true, display: true } as const;
export type ReadObject = SuiClientTypes.Object<typeof OBJECT_INCLUDE>;

export async function listAllEvents(
  client: ClientWithCoreApi,
  eventType: string,
): Promise<SuiClientTypes.EventEntry[]> {
  const events: SuiClientTypes.EventEntry[] = [];
  let before: string | null = null;

  // gRPC pages can come back short or empty with hasNextPage=true; keep paging.
  while (true) {
    const page = await client.core.listEvents({
      filter: { eventType },
      order: "descending",
      before,
    });
    events.push(...page.events);
    if (!page.hasNextPage || !page.endCursor) break;
    before = page.endCursor;
  }

  return events;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function nftFromObject(obj: ReadObject | Error): MarketplaceNFT | null {
  if (obj instanceof Error) return null;

  const display = obj.display?.output;
  const fields = obj.json;

  let name = "";
  let description = "";
  let imageUrl = "";
  let collection = "";
  let rarity = "";

  if (display) {
    name = str(display.name);
    description = str(display.description);
    imageUrl = str(display.image_url);
    collection = str(display.collection);
    rarity = str(display.rarity);
  }
  if (fields) {
    if (!name) name = str(fields.name);
    if (!description) description = str(fields.description);
    if (!imageUrl) imageUrl = str(fields.image_url);
    if (!collection) collection = str(fields.collection);
    if (!rarity) rarity = str(fields.rarity);
  }

  const owner =
    obj.owner.$kind === "AddressOwner" ? obj.owner.AddressOwner : "";

  return {
    id: obj.objectId,
    name,
    description,
    imageUrl,
    owner,
    collection,
    rarity,
  };
}

export function parseBidObject(obj: ReadObject | Error): BidObject | null {
  if (obj instanceof Error) return null;
  const fields = obj.json;
  if (!fields) return null;
  return {
    id: obj.objectId,
    bidder: fields.bidder as string,
    offeredCount: Number(fields.offered_count),
    offeredSui: parseOfferedSui(fields.offered_sui),
    requestedCount: Number(fields.requested_count),
    targetNftId: parseOptionalId(fields.target_nft_id),
  };
}

export async function fetchObjects(
  client: ClientWithCoreApi,
  ids: string[],
): Promise<(ReadObject | Error)[]> {
  if (ids.length === 0) return [];
  const { objects } = await client.core.getObjects({
    objectIds: ids,
    include: OBJECT_INCLUDE,
  });
  return objects;
}

export async function fetchNfts(
  client: ClientWithCoreApi,
  ids: string[],
): Promise<Map<string, MarketplaceNFT>> {
  const out = new Map<string, MarketplaceNFT>();
  if (ids.length === 0) return out;
  const objs = await fetchObjects(client, ids);
  for (const obj of objs) {
    const nft = nftFromObject(obj);
    if (nft) out.set(nft.id, nft);
  }
  return out;
}

export async function fetchOfferedNfts(
  client: ClientWithCoreApi,
  bidId: string,
): Promise<MarketplaceNFT[]> {
  const childIds: string[] = [];
  let cursor: string | null = null;
  try {
    do {
      const page: SuiClientTypes.ListDynamicFieldsResponse =
        await client.core.listDynamicFields({ parentId: bidId, cursor });
      for (const entry of page.dynamicFields) {
        if (entry.$kind === "DynamicObject") childIds.push(entry.childId);
      }
      cursor = page.hasNextPage ? page.cursor : null;
    } while (cursor);
  } catch {
    // The bid may have been consumed since it was listed; v2 clients throw then.
    return [];
  }
  const nftMap = await fetchNfts(client, childIds);
  return Array.from(nftMap.values());
}

export function receivedSummary(entry: EnrichedBid): string {
  const [first, ...rest] = entry.offeredNfts;
  const hasSui = entry.bid.offeredSui !== "0";
  if (!first) return hasSui ? "The SUI is now in your wallet." : "The trade went through.";
  const extras = rest.length + (hasSui ? 1 : 0);
  if (extras === 0) return `${first.name} is now in your wallet.`;
  const more = rest.length > 0 ? `${rest.length} more NFT${rest.length === 1 ? "" : "s"}` : "";
  const tail = [more, hasSui ? "the SUI" : ""].filter(Boolean).join(" and ");
  return `${first.name}, ${tail} are now in your wallet.`;
}
