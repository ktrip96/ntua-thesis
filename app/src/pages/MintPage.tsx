import { useEffect, useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { WalletGate } from "@/components/WalletGate";
import { NFTImage } from "@/components/nft/NFTImage";
import { RarityPill } from "@/components/nft/Rarity";
import { useMintNFT } from "@/hooks/useMintNFT";
import { CATALOG, COLLECTIONS, RARITY_ORDER, type CatalogItem, type Collection } from "@/config/catalog";
import { cn } from "@/lib/utils";

const itemKey = (item: CatalogItem) => `${item.collection}-${item.rarity}`;

export function MintPage() {
  const account = useCurrentAccount();
  const { mint } = useMintNFT();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  // Mints share the wallet's gas coin, so they run one at a time; extra clicks queue.
  const [queue, setQueue] = useState<{ item: CatalogItem; quantity: number }[]>([]);
  const [mobileCollection, setMobileCollection] = useState<Collection>("car");

  const handleMint = (item: CatalogItem, quantity: number) => {
    const key = itemKey(item);
    if (pendingKey === null) {
      setPendingKey(key);
      mint(item, quantity, () => setPendingKey(null));
    } else if (pendingKey !== key && !queue.some((q) => itemKey(q.item) === key)) {
      setQueue((q) => [...q, { item, quantity }]);
    }
  };

  const dequeue = (item: CatalogItem) =>
    setQueue((q) => q.filter((entry) => itemKey(entry.item) !== itemKey(item)));

  useEffect(() => {
    if (pendingKey !== null || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setPendingKey(itemKey(next.item));
    mint(next.item, next.quantity, () => setPendingKey(null));
    // `mint` changes every render; the queue and pending key are the real triggers.
  }, [pendingKey, queue]);

  if (!account) {
    return <WalletGate title="Mint free NFTs" description="Connect your wallet to start minting." />;
  }

  return (
    <div>
      <PageHeader
        title="Mint"
        description="Free and unlimited on this test network. Stock up, then go make offers."
      />

      <div className="mb-3.5 flex gap-1.5 overflow-x-auto md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {COLLECTIONS.map((coll) => (
          <button
            key={coll.id}
            type="button"
            onClick={() => setMobileCollection(coll.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
              mobileCollection === coll.id
                ? "bg-neutral-900 font-semibold text-white"
                : "border border-border bg-white text-fg-muted",
            )}
          >
            {coll.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-7">
        {COLLECTIONS.map((coll) => {
          const items = RARITY_ORDER.map((rarity) =>
            CATALOG.find((it) => it.collection === coll.id && it.rarity === rarity),
          ).filter((it): it is CatalogItem => !!it);
          return (
            <section
              key={coll.id}
              className={cn("flex flex-col gap-3", mobileCollection !== coll.id && "hidden md:flex")}
            >
              <h2 className="hidden text-[17px] font-bold md:block">{coll.label}</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:gap-4">
                {items.map((item) => {
                  const key = itemKey(item);
                  return (
                    <MintCard
                      key={key}
                      item={item}
                      onMint={handleMint}
                      isPending={pendingKey === key}
                      isQueued={queue.some((q) => itemKey(q.item) === key)}
                      onDequeue={() => dequeue(item)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MintCard({
  item,
  onMint,
  isPending,
  isQueued,
  onDequeue,
}: {
  item: CatalogItem;
  onMint: (item: CatalogItem, quantity: number) => void;
  isPending: boolean;
  isQueued: boolean;
  onDequeue: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const locked = isPending || isQueued;

  return (
    <div
      className={cn(
        "surface flex gap-3 rounded-[20px] p-3 transition-[box-shadow] duration-500 ease-out-soft sm:gap-3.5 sm:p-3.5",
        isPending ? "ring-2 ring-ube-400" : isQueued && "ring-2 ring-ube-200",
      )}
    >
      <span className="size-[92px] shrink-0 overflow-hidden rounded-[14px] bg-bg-muted sm:size-[104px]">
        <NFTImage src={item.imageUrl} alt={item.name} compact />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold sm:text-[14.5px]">{item.name}</span>
          <Badge variant="accent" className="px-2 py-0 text-[11px]">
            Free
          </Badge>
        </div>
        <RarityPill rarity={item.rarity} size="sm" className="self-start" />
        <div className="mt-auto flex items-center gap-2 pt-1 sm:gap-2.5">
          <span
            className={cn(
              "inline-flex h-9 items-center rounded-full border border-border sm:h-8",
              locked && "opacity-50",
            )}
            role="group"
            aria-label="Quantity"
          >
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={locked || quantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-full w-8 items-center justify-center text-fg-muted disabled:cursor-not-allowed sm:w-[30px]"
            >
              <Minus className="size-3.5" weight="bold" />
            </button>
            <span className="w-[22px] text-center font-mono text-[13px] font-semibold tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              disabled={locked}
              aria-label="Increase quantity"
              className="flex h-full w-8 items-center justify-center text-fg-muted disabled:cursor-not-allowed sm:w-[30px]"
            >
              <Plus className="size-3.5" weight="bold" />
            </button>
          </span>
          {isQueued ? (
            <Button
              variant="soft"
              className="h-[38px] flex-1 sm:h-[34px]"
              onClick={onDequeue}
              title="Click to remove from the queue"
            >
              Queued, tap to undo
            </Button>
          ) : (
            <Button
              className="h-[38px] flex-1 sm:h-[34px]"
              onClick={() => onMint(item, quantity)}
              loading={isPending}
            >
              {isPending ? "Minting…" : quantity > 1 ? `Mint ×${quantity}` : "Mint"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
