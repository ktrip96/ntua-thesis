import { NFTImage } from "@/components/nft/NFTImage";
import { RarityPill } from "@/components/nft/Rarity";
import { AddressLink } from "@/components/ExplorerLink";
import { SuiMark } from "@/components/bid/TradePills";
import { formatSui } from "@/lib/bidFields";
import type { MarketplaceNFT } from "@/types";

export function NFTRow({ nft, size = 48 }: { nft: MarketplaceNFT; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        style={{ width: size, height: size }}
        className="shrink-0 overflow-hidden rounded-[10px] bg-bg-muted"
      >
        <NFTImage src={nft.imageUrl} alt={nft.name} compact />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold">{nft.name || "Unnamed NFT"}</span>
          <RarityPill rarity={nft.rarity} size="xs" />
        </div>
        <AddressLink address={nft.id} objectId={nft.id} className="mt-0.5 text-[11.5px]" />
      </div>
    </div>
  );
}

export function SuiRow({ mist, size = 48 }: { mist: string | bigint; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <SuiMark size={size} />
      <div className="text-[13.5px] font-semibold">{formatSui(mist)} SUI</div>
    </div>
  );
}

export function AssetPanel({
  label,
  tone,
  nfts,
  mist,
  emptyText = "Nothing",
}: {
  label: string;
  tone: "neutral" | "ube" | "dragonfruit";
  nfts: MarketplaceNFT[];
  mist: string | bigint;
  emptyText?: string;
}) {
  const hasSui = BigInt(mist || 0) > 0n;
  const styles = {
    neutral: "bg-bg-subtle border-border text-fg-muted",
    ube: "bg-ube-100 border-ube-200 text-ube-700",
    dragonfruit: "bg-dragonfruit-100 border-dragonfruit-200 text-dragonfruit-700",
  }[tone];
  return (
    <div className={`flex flex-col gap-2.5 rounded-[14px] border p-3.5 ${styles}`}>
      <span className="mono-label text-[10.5px] text-inherit">{label}</span>
      <div className="flex flex-col gap-2.5 text-fg">
        {hasSui && <SuiRow mist={mist} />}
        {nfts.map((nft) => (
          <NFTRow key={nft.id} nft={nft} />
        ))}
        {!hasSui && nfts.length === 0 && (
          <span className="text-xs text-fg-subtle">{emptyText}</span>
        )}
      </div>
    </div>
  );
}
