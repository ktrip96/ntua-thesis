import { Diamond } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type RarityTier = "common" | "uncommon" | "rare";

export function rarityTier(rarity: string | undefined): RarityTier {
  return rarity === "uncommon" || rarity === "rare" ? rarity : "common";
}

const label: Record<RarityTier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
};

export function RarityPill({
  rarity,
  size = "md",
  className,
}: {
  rarity: string | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const tier = rarityTier(rarity);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-mono uppercase tracking-[0.06em]",
        size === "md" && "px-2.5 py-[3px] text-[10px]",
        size === "sm" && "px-2 py-[2px] text-[9px]",
        size === "xs" && "px-[7px] py-px text-[9px]",
        `rarity-${tier}`,
        className,
      )}
    >
      {size === "md" && <Diamond className="size-2" weight="fill" aria-hidden />}
      {label[tier]}
    </span>
  );
}

export function RarityDot({
  rarity,
  size = 14,
  className,
  decorative = false,
}: {
  rarity: string | undefined;
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const tier = rarityTier(rarity);
  return (
    <span
      aria-label={decorative ? undefined : label[tier]}
      aria-hidden={decorative || undefined}
      title={decorative ? undefined : label[tier]}
      style={{ width: size, height: size }}
      className={cn(
        "inline-block shrink-0 rounded-full border-[1.5px] border-white shadow-[0_1px_2px_rgba(0,0,0,.2)]",
        `rarity-${tier}`,
        className,
      )}
    />
  );
}

export function rarityFrameClass(rarity: string | undefined): string {
  return `border-2 rarity-frame-${rarityTier(rarity)}`;
}
