import { Check } from "@phosphor-icons/react";
import { useSearchParams } from "react-router-dom";
import { RarityDot, type RarityTier } from "@/components/nft/Rarity";
import { RARITY_ORDER } from "@/config/catalog";
import { cn } from "@/lib/utils";

const PARAM = "rarity";

const isTier = (value: string): value is RarityTier =>
  (RARITY_ORDER as string[]).includes(value);

// Selection lives in the URL as `?rarity=common&rarity=rare`; empty means all.
export function useRarityFilter() {
  const [params, setParams] = useSearchParams();
  const selected = params.getAll(PARAM).filter(isTier);

  const toggle = (tier: RarityTier) => {
    const next = selected.includes(tier)
      ? selected.filter((t) => t !== tier)
      : RARITY_ORDER.filter((t) => t === tier || selected.includes(t));
    const nextParams = new URLSearchParams(params);
    nextParams.delete(PARAM);
    next.forEach((t) => nextParams.append(PARAM, t));
    setParams(nextParams, { replace: true });
  };

  const clear = () => {
    const nextParams = new URLSearchParams(params);
    nextParams.delete(PARAM);
    setParams(nextParams, { replace: true });
  };

  const matches = (rarity: string | undefined) =>
    selected.length === 0 || selected.includes(rarity as RarityTier);

  return { selected, toggle, clear, matches };
}

const label: Record<RarityTier, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare" };

interface RarityFilterProps {
  selected: RarityTier[];
  counts: Record<RarityTier, number>;
  onToggle: (tier: RarityTier) => void;
  onClear: () => void;
  className?: string;
}

export function RarityFilter({ selected, counts, onToggle, onClear, className }: RarityFilterProps) {
  const allActive = selected.length === 0;
  return (
    <div
      role="group"
      aria-label="Filter by rarity"
      className={cn(
        "flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <Chip active={allActive} onClick={onClear} aria-pressed={allActive}>
        All
      </Chip>
      {RARITY_ORDER.map((tier) => {
        const active = selected.includes(tier);
        return (
          <Chip
            key={tier}
            active={active}
            onClick={() => onToggle(tier)}
            aria-pressed={active}
            aria-label={`${label[tier]}, ${counts[tier]} on the table`}
          >
            {active ? (
              <Check className="size-3" weight="bold" aria-hidden />
            ) : (
              <RarityDot rarity={tier} size={10} className="border-0 shadow-none" decorative />
            )}
            {label[tier]}
            <span className={cn("font-mono text-[11px] tabular-nums", active ? "text-white/70" : "text-fg-subtle")}>
              {counts[tier]}
            </span>
          </Chip>
        );
      })}
    </div>
  );
}

function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-[color,background-color,box-shadow,transform] duration-300 ease-out-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ube-500/40 active:scale-[0.98]",
        active
          ? "bg-neutral-900 font-semibold text-white"
          : "surface text-fg-muted hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}
