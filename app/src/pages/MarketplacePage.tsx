import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NFTImage } from "@/components/nft/NFTImage";
import { useMarketplaceNFTs } from "@/hooks/useMarketplaceNFTs";
import { COLLECTIONS, collectionHeroImage, type Collection } from "@/config/catalog";

const STEPS = ["Mint free NFTs", "Make an offer on anything you like", "Owner accepts, you swap"];

export function MarketplacePage() {
  const { data: nfts, isLoading } = useMarketplaceNFTs();

  const countFor = (collection: Collection) =>
    (nfts ?? []).filter((nft) => nft.collection === collection).length;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section className="flex max-w-[900px] flex-col gap-3 pt-2 sm:gap-3.5 sm:pt-6">
        <h1 className="text-[27px] font-extrabold leading-[1.12] tracking-[-0.01em] sm:text-[38px] lg:text-[46px]">
          Trade NFTs for NFTs.
        </h1>
        <p className="max-w-[620px] text-sm leading-relaxed text-fg-muted sm:text-base">
          No prices, no auctions. Offer your NFTs, SUI, or both. If the owner accepts, you swap on the spot.
        </p>
        <ol className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-fg-muted">
          {STEPS.map((text, i) => (
            <li key={text} className="inline-flex items-center gap-2">
              <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-ube-100 text-[11px] font-bold text-ube-700">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-3">
        {COLLECTIONS.map((coll, i) => (
          <Link
            key={coll.id}
            to={`/marketplace/${coll.id}`}
            style={{ "--i": i } as CSSProperties}
            className="surface surface-hover enter group overflow-hidden rounded-[20px] text-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ube-500/40"
          >
            <div className="relative h-[150px] bg-bg-muted sm:h-[230px]">
              <NFTImage src={collectionHeroImage(coll.id)} alt={coll.label} />
              <Badge variant="dark" className="absolute right-3 top-3 px-[11px] py-0.5 tabular-nums">
                {isLoading ? "…" : `${countFor(coll.id)} minted`}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2.5 px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-[18px]">
              <div>
                <div className="text-[17px] font-bold tracking-[-0.01em] sm:text-[19px]">{coll.label}</div>
                <div className="mt-0.5 text-[12.5px] text-fg-muted sm:text-[13px]">{coll.tagline}</div>
              </div>
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ube-500 text-white transition-[background-color,transform] duration-500 ease-out-soft group-hover:translate-x-0.5 group-hover:bg-ube-600">
                <ArrowRight className="size-4" weight="bold" />
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-ube-100 to-dragonfruit-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-[18px]">
        <p className="text-[13.5px] leading-snug text-ube-800 sm:text-[14.5px]">
          <strong>Nothing to trade yet?</strong> Minting is free and unlimited on this test network.
        </p>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/mint">Mint your first NFT</Link>
        </Button>
      </section>
    </div>
  );
}
