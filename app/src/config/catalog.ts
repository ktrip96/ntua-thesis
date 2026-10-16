export type Collection = "car" | "house" | "tickets";
export type Rarity = "common" | "uncommon" | "rare";

export interface CatalogItem {
  collection: Collection;
  rarity: Rarity;
  name: string;
  description: string;
  imageUrl: string;
}

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare"];

export interface CollectionMeta {
  id: Collection;
  label: string;
  singular: string;
  tagline: string;
}

export const COLLECTIONS: CollectionMeta[] = [
  { id: "car", label: "Cars", singular: "car", tagline: "Sedans to supercars" },
  { id: "house", label: "Houses", singular: "house", tagline: "Cottages to mansions" },
  { id: "tickets", label: "Tickets", singular: "ticket", tagline: "Screenings to festivals" },
];

export function collectionMeta(id: string): CollectionMeta | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}

export function collectionHeroImage(id: Collection): string {
  return CATALOG.find((it) => it.collection === id && it.rarity === "rare")?.imageUrl ?? "";
}

// Image URLs end up in on-chain metadata, so they must stay publicly reachable.
const UNSPLASH_SIZE = "?w=600&h=600&fit=crop";

export const CATALOG: CatalogItem[] = [
  {
    collection: "car",
    rarity: "common",
    name: "Common Sedan",
    description: "A reliable everyday sedan.",
    imageUrl: `https://images.unsplash.com/photo-1494976388531-d1058494cdd8${UNSPLASH_SIZE}`,
  },
  {
    collection: "car",
    rarity: "uncommon",
    name: "Uncommon Coupe",
    description: "A sleek coupe for the discerning driver.",
    imageUrl: `https://images.unsplash.com/photo-1503376780353-7e6692767b70${UNSPLASH_SIZE}`,
  },
  {
    collection: "car",
    rarity: "rare",
    name: "Rare Supercar",
    description: "A one-of-a-kind supercar.",
    imageUrl: `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7${UNSPLASH_SIZE}`,
  },
  {
    collection: "house",
    rarity: "common",
    name: "Common Cottage",
    description: "A cozy starter cottage.",
    imageUrl: `https://images.unsplash.com/photo-1568605114967-8130f3a36994${UNSPLASH_SIZE}`,
  },
  {
    collection: "house",
    rarity: "uncommon",
    name: "Uncommon Townhouse",
    description: "A spacious townhouse in a great neighborhood.",
    imageUrl: `https://images.unsplash.com/photo-1564013799919-ab600027ffc6${UNSPLASH_SIZE}`,
  },
  {
    collection: "house",
    rarity: "rare",
    name: "Rare Mansion",
    description: "A sprawling luxury mansion.",
    imageUrl: `https://images.unsplash.com/photo-1613490493576-7fde63acd811${UNSPLASH_SIZE}`,
  },
  {
    collection: "tickets",
    rarity: "common",
    name: "Common Movie Ticket",
    description: "Admission for one to a regular screening.",
    imageUrl: `https://images.unsplash.com/photo-1499364615650-ec38552f4f34${UNSPLASH_SIZE}`,
  },
  {
    collection: "tickets",
    rarity: "uncommon",
    name: "Uncommon Concert Ticket",
    description: "General admission to a sold-out show.",
    imageUrl: `https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3${UNSPLASH_SIZE}`,
  },
  {
    collection: "tickets",
    rarity: "rare",
    name: "Rare VIP Festival Pass",
    description: "Backstage VIP access to a multi-day festival.",
    imageUrl: `https://images.unsplash.com/photo-1507676184212-d03ab07a01bf${UNSPLASH_SIZE}`,
  },
];

export function findCatalogItem(
  collection: string,
  rarity: string,
): CatalogItem | undefined {
  return CATALOG.find(
    (item) => item.collection === collection && item.rarity === rarity,
  );
}
