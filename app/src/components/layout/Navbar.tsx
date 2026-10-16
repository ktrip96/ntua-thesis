import { Link, NavLink } from "react-router-dom";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { WalletTools } from "@/components/layout/WalletTools";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Marketplace" },
  { to: "/mint", label: "Mint" },
  { to: "/my-nfts", label: "My NFTs" },
  { to: "/my-bids", label: "My bids" },
];

function NavPills({ className }: { className?: string }) {
  return (
    <nav className={cn("flex items-center gap-0.5", className)} aria-label="Primary">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) =>
            cn(
              "whitespace-nowrap rounded-full px-[13px] py-1.5 text-sm font-medium transition-[color,background-color] duration-300 ease-out-soft",
              isActive
                ? "bg-ube-100 font-semibold text-ube-700"
                : "text-fg-muted hover:bg-bg-muted hover:text-fg",
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 md:top-3 md:px-6 lg:px-8">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur-xl sm:gap-7 md:h-[60px] md:rounded-full md:border-0 md:bg-white/80 md:pl-5 md:pr-2.5 md:shadow-nav md:ring-1 md:ring-ube-900/[0.06] md:supports-[backdrop-filter]:bg-white/70">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 text-[15px] font-bold text-fg sm:text-base">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-ube-500 text-white">
            <ArrowsLeftRight className="size-[15px]" weight="bold" />
          </span>
          <span className="max-[400px]:sr-only">NFT Barter</span>
        </Link>
        <NavPills className="hidden flex-1 md:flex" />
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <WalletTools />
          <ConnectButton />
        </div>
      </div>
      <div className="overflow-x-auto border-b border-border bg-white/90 px-4 py-2 backdrop-blur-xl md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <NavPills className="gap-1.5" />
      </div>
    </header>
  );
}
