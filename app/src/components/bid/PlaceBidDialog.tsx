import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, X } from "@phosphor-icons/react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NFTImage } from "@/components/nft/NFTImage";
import { RarityPill, RarityDot } from "@/components/nft/Rarity";
import { AddressLink, ExplorerLink } from "@/components/ExplorerLink";
import { AvatarStack, OfferPill, SuiMark, SwapGlyph } from "@/components/bid/TradePills";
import { AssetPanel } from "@/components/bid/AssetRows";
import { EmptyState } from "@/components/EmptyState";
import { formatSui, offerSummary, suiStringToMist } from "@/lib/bidFields";
import { truncateAddress, cn } from "@/lib/utils";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import { usePlaceBid } from "@/hooks/usePlaceBid";
import type { MarketplaceNFT } from "@/types";

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Add SUI" },
  { n: 2, label: "Pick NFTs" },
  { n: 3, label: "Review" },
];

const QUICK_AMOUNTS = ["0.1", "0.5", "1", "5"];

interface PlaceBidDialogProps {
  targetNft: MarketplaceNFT | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlaceBidDialog({ targetNft, open, onOpenChange }: PlaceBidDialogProps) {
  const account = useCurrentAccount();
  const { data: ownedNfts, isLoading } = useOwnedNFTs(account?.address);
  const { placeBid, isPending } = usePlaceBid();

  const [step, setStep] = useState<Step>(1);
  const [suiAmount, setSuiAmount] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      // Full-screen flow: clear any toast that would cover its footer.
      toast.dismiss();
    } else {
      setStep(1);
      setSuiAmount("");
      setSelected(new Set());
    }
  }, [open]);

  const { mistAmount, suiError } = useMemo(() => {
    if (!suiAmount.trim()) return { mistAmount: 0n, suiError: null as string | null };
    try {
      return { mistAmount: suiStringToMist(suiAmount), suiError: null };
    } catch {
      return { mistAmount: 0n, suiError: "Enter a valid SUI amount" };
    }
  }, [suiAmount]);

  const offerable = useMemo(
    () => (ownedNfts ?? []).filter((n) => n.id !== targetNft?.id),
    [ownedNfts, targetNft?.id],
  );
  const selectedNfts = offerable.filter((n) => selected.has(n.id));
  const hasSui = mistAmount > 0n;
  const hasOffer = selectedNfts.length > 0 || hasSui;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = () => {
    if (!targetNft || !hasOffer || suiError) return;
    placeBid(Array.from(selected), mistAmount, targetNft.id, () => onOpenChange(false));
  };

  const next = () => {
    if (step === 1 && !suiError) setStep(2);
    else if (step === 2 && hasOffer) setStep(3);
  };
  const skipSui = () => {
    setSuiAmount("");
    setStep(2);
  };
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  if (!targetNft) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent variant="fullscreen" aria-describedby={undefined}>
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3.5 md:h-16 md:gap-5 md:px-6">
          {step === 1 ? (
            <DialogClose asChild>
              <Button variant="outline" size="icon" className="rounded-full" aria-label="Close">
                <X weight="bold" />
              </Button>
            </DialogClose>
          ) : (
            <Button variant="outline" size="icon" className="rounded-full md:hidden" onClick={back} aria-label="Back">
              <ArrowLeft weight="bold" />
            </Button>
          )}
          {step !== 1 && (
            <DialogClose asChild>
              <Button variant="outline" size="icon" className="hidden rounded-full md:inline-flex" aria-label="Close">
                <X weight="bold" />
              </Button>
            </DialogClose>
          )}
          <DialogTitle className="text-[15px] md:text-base">
            {step === 3 ? <span className="md:hidden">Review your trade</span> : null}
            <span className={cn(step === 3 && "hidden md:inline")}>Place a bid</span>
          </DialogTitle>
          <Stepper step={step} className="hidden flex-1 justify-center md:flex" />
          <StepDots step={step} className="ml-auto md:hidden" />
          {account && (
            <span className="hidden font-mono text-xs text-fg-muted lg:inline">
              Bidding as {truncateAddress(account.address)}
            </span>
          )}
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[380px_1fr] xl:grid-cols-[460px_1fr]">
          <aside className="hidden flex-col gap-[18px] overflow-y-auto border-r border-border bg-bg-subtle p-8 md:flex">
            <TagLabel tone="dragonfruit">You get</TagLabel>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-muted">
              <div className="aspect-square">
                <NFTImage src={targetNft.imageUrl} alt={targetNft.name} />
              </div>
              <RarityPill rarity={targetNft.rarity} className="absolute left-3 top-3" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[22px] font-bold tracking-[-0.005em]">{targetNft.name}</div>
              {targetNft.description && (
                <div className="text-[13.5px] text-fg-muted">{targetNft.description}</div>
              )}
              <AddressLink address={targetNft.owner} objectId={targetNft.id} text={`owned by ${truncateAddress(targetNft.owner)}`} />
            </div>
            <p className="mt-auto border-t border-border pt-3.5 text-[12.5px] leading-relaxed text-fg-muted">
              The owner sees your offer and can accept or reject it. You can cancel any time, and everything comes back to your wallet.
            </p>
          </aside>

          <section className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4 md:p-8 lg:px-10">
            {step !== 3 && (
              <div className="flex items-center gap-3 rounded-[14px] border border-dragonfruit-200 bg-dragonfruit-100 p-3 md:hidden">
                <span className="size-11 shrink-0 overflow-hidden rounded-[10px]">
                  <NFTImage src={targetNft.imageUrl} alt={targetNft.name} compact />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mono-label text-[10px] text-dragonfruit-700">You get</div>
                  <div className="truncate text-sm font-bold">{targetNft.name}</div>
                </div>
                <RarityPill rarity={targetNft.rarity} size="xs" />
              </div>
            )}

            {step === 1 && (
              <>
                <TagLabel tone="ube">You give</TagLabel>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold">Add SUI to your offer</span>
                    <Badge variant="neutral" className="px-2 py-0 text-[11px]">
                      Optional
                    </Badge>
                  </div>
                  <div className="text-[12.5px] text-fg-muted">
                    You can offer SUI only, NFTs only, or both. Skip this step to offer NFTs alone.
                  </div>
                </div>
                <div className="flex max-w-md flex-col gap-3">
                  <div className="relative">
                    <Input
                      id="sui-amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      autoFocus
                      value={suiAmount}
                      onChange={(e) => setSuiAmount(e.target.value)}
                      aria-invalid={!!suiError}
                      aria-label="SUI amount"
                      className="h-14 pr-16 text-[22px] font-semibold"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-fg-muted">
                      SUI
                    </span>
                  </div>
                  {suiError ? (
                    <p className="text-xs font-medium text-danger">{suiError}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {QUICK_AMOUNTS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSuiAmount(amt)}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                            suiAmount === amt
                              ? "border-ube-400 bg-ube-100 text-ube-700"
                              : "border-border bg-white text-fg-muted hover:border-border-strong",
                          )}
                        >
                          {amt} SUI
                        </button>
                      ))}
                      {suiAmount && (
                        <button
                          type="button"
                          onClick={() => setSuiAmount("")}
                          className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-fg-muted hover:text-fg"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <TagLabel tone="ube">You give</TagLabel>
                <div className="flex items-center gap-3.5 rounded-[14px] border border-border bg-white px-[18px] py-3.5">
                  <SuiMark size={38} />
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">{hasSui ? `${formatSui(mistAmount)} SUI` : "No SUI added"}</div>
                    <div className="text-xs text-fg-muted">{hasSui ? "added in step 1" : "skipped, you're offering NFTs only"}</div>
                  </div>
                  <button type="button" onClick={back} className="text-[13px] font-semibold text-link hover:text-blueberry-700">
                    {hasSui ? "Change" : "Add SUI"}
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-[15px] font-semibold">Add NFTs from your wallet</div>
                  <div className="text-[12.5px] text-fg-muted">
                    Pick any of your NFTs to sweeten the offer.{" "}
                    {selectedNfts.length > 0 ? `${selectedNfts.length} selected.` : "None selected yet."}
                  </div>
                </div>
                {isLoading ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="skeleton h-[78px] rounded-[14px]" />
                    <div className="skeleton h-[78px] rounded-[14px]" />
                    <div className="skeleton h-[78px] rounded-[14px]" />
                  </div>
                ) : offerable.length === 0 ? (
                  <EmptyState
                    size="sm"
                    title="Nothing else to offer"
                    description={hasSui ? "You don't own any other NFTs, but your SUI offer still stands." : "You don't own any other NFTs. Add some SUI or mint something first."}
                  />
                ) : (
                  <div className="flex flex-col gap-2.5" role="group" aria-label="Your NFTs">
                    {offerable.map((nft) => {
                      const checked = selected.has(nft.id);
                      return (
                        <div
                          key={nft.id}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          onClick={() => toggle(nft.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggle(nft.id);
                            }
                          }}
                          className={cn(
                            "flex cursor-pointer items-center gap-3.5 rounded-[14px] border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ube-500/40",
                            checked
                              ? "border-[1.5px] border-ube-400 bg-ube-100"
                              : "border border-border bg-white hover:border-border-strong",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px]",
                              checked ? "border-ube-500 bg-ube-500 text-white" : "border-border-strong bg-white",
                            )}
                            aria-hidden
                          >
                            {checked && <Check className="size-[13px]" weight="bold" />}
                          </span>
                          <span className="size-[52px] shrink-0 overflow-hidden rounded-[10px] bg-bg-muted">
                            <NFTImage src={nft.imageUrl} alt={nft.name} compact />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{nft.name || "Unnamed NFT"}</div>
                            {nft.description && (
                              <div className="truncate text-xs text-fg-muted">{nft.description}</div>
                            )}
                          </div>
                          <RarityDot rarity={nft.rarity} size={12} className="border-0 shadow-none" />
                          <ExplorerLink id={nft.id} size="sm" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-3 md:max-w-xl">
                <AssetPanel label="You give" tone="neutral" nfts={selectedNfts} mist={mistAmount} />
                <div className="flex justify-center md:hidden">
                  <SwapGlyph framed className="size-10" />
                </div>
                <div className="rounded-2xl border border-dragonfruit-200 bg-dragonfruit-100 p-3.5 md:hidden">
                  <span className="mono-label text-[10px] text-dragonfruit-700">You get</span>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="size-16 shrink-0 overflow-hidden rounded-xl">
                      <NFTImage src={targetNft.imageUrl} alt={targetNft.name} compact />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-bold">{targetNft.name}</span>
                        <RarityPill rarity={targetNft.rarity} size="xs" />
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-dragonfruit-800">
                        from {truncateAddress(targetNft.owner)}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs leading-relaxed text-fg-muted md:text-left">
                  Your NFTs and SUI are held by the bid until the owner decides. Cancel any time to get them back.
                </p>
                <p className="text-center text-[11.5px] text-fg-subtle md:text-left">Your wallet will ask you to approve.</p>
              </div>
            )}
          </section>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-border bg-white px-3.5 py-3 md:gap-5 md:px-6 md:py-4">
          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <OfferPill tone="ube" nfts={selectedNfts}>
              {hasOffer ? offerSummary(selectedNfts.length, mistAmount.toString()) : "Nothing yet"}
            </OfferPill>
            <SwapGlyph />
            <OfferPill tone="dragonfruit">
              <span className="inline-flex items-center gap-2">
                <AvatarStack nfts={[targetNft]} size={26} />
                {targetNft.name}
              </span>
            </OfferPill>
          </div>
          {step > 1 && (
            <Button variant="outline" size="lg" onClick={back} className="hidden md:inline-flex" disabled={isPending}>
              Back
            </Button>
          )}
          {step === 1 && (
            <div className="ml-auto flex w-full gap-2.5 md:w-auto">
              <Button variant="outline" size="lg" className="flex-1 md:flex-none" onClick={skipSui}>
                Skip
              </Button>
              <Button size="lg" className="flex-1 md:flex-none" onClick={next} disabled={!!suiError || !hasSui}>
                Continue
                <ArrowRight weight="bold" />
              </Button>
            </div>
          )}
          {step === 2 && (
            <Button size="lg" className="ml-auto w-full md:w-auto" onClick={next} disabled={!hasOffer}>
              Review trade
              <ArrowRight weight="bold" />
            </Button>
          )}
          {step === 3 && (
            <Button size="xl" className="ml-auto w-full md:h-11 md:w-auto md:text-sm" onClick={submit} loading={isPending} disabled={!hasOffer}>
              {isPending ? "Placing bid…" : "Place bid"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TagLabel({ tone, children }: { tone: "ube" | "dragonfruit"; children: string }) {
  return (
    <span
      className={cn(
        "mono-label self-start rounded-full px-3 py-1 font-medium",
        tone === "ube" ? "bg-ube-100 text-ube-700" : "bg-dragonfruit-100 text-dragonfruit-700",
      )}
    >
      {children}
    </span>
  );
}

function Stepper({ step, className }: { step: Step; className?: string }) {
  return (
    <ol className={cn("items-center gap-2", className)} aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = s.n < step;
        const current = s.n === step;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 text-[13px]",
                done || current ? "font-semibold text-ube-700" : "font-medium text-fg-subtle",
              )}
              aria-current={current ? "step" : undefined}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold",
                  done || current ? "bg-ube-500 text-white" : "border-[1.5px] border-border-strong",
                )}
              >
                {done ? <Check className="size-3" weight="bold" /> : s.n}
              </span>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={cn("h-px w-9", done ? "bg-ube-300" : "bg-border-strong")} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepDots({ step, className }: { step: Step; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-label={`Step ${step} of 3`}>
      {STEPS.map((s) => (
        <span
          key={s.n}
          className={cn(
            "h-[7px] rounded-full transition-all",
            s.n === step ? "w-5 bg-ube-500" : s.n < step ? "w-[7px] bg-ube-500" : "w-[7px] bg-border-strong",
          )}
        />
      ))}
    </span>
  );
}
