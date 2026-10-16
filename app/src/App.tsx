import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { Toaster } from "sonner";
import { Check, X } from "@phosphor-icons/react";
import { dAppKit } from "./dapp-kit";
import { Navbar } from "./components/layout/Navbar";
import { MarketplacePage } from "./pages/MarketplacePage";
import { CollectionPage } from "./pages/CollectionPage";
import { MintPage } from "./pages/MintPage";
import { MyNFTsPage } from "./pages/MyNFTsPage";
import { MyBidsPage } from "./pages/MyBidsPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <BrowserRouter>
          <div className="min-h-dvh bg-bg-subtle">
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ube-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
            >
              Skip to content
            </a>
            <Navbar />
            <main id="main" className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              <Routes>
                <Route path="/" element={<MarketplacePage />} />
                <Route path="/marketplace/:collection" element={<CollectionPage />} />
                <Route path="/mint" element={<MintPage />} />
                <Route path="/my-nfts" element={<MyNFTsPage />} />
                <Route path="/my-bids" element={<MyBidsPage />} />
              </Routes>
            </main>
          </div>
          <Toaster
            position="bottom-right"
            gap={10}
            offset={24}
            closeButton
            duration={3500}
            icons={{
              success: (
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="size-3.5" weight="bold" />
                </span>
              ),
              error: (
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <X className="size-[13px]" weight="bold" />
                </span>
              ),
            }}
            toastOptions={{
              unstyled: true,
              classNames: {
                toast:
                  "flex w-[340px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-[16px] bg-white px-4 py-3.5 font-sans shadow-overlay ring-1 ring-ube-900/[0.06]",
                content: "flex-1 min-w-0",
                title: "text-[13.5px] font-semibold text-fg",
                description: "mt-px text-[12.5px] text-fg-muted",
                icon: "m-0 shrink-0",
                closeButton:
                  "!static !order-last !ml-auto !size-5 !rounded-full !border-0 !bg-transparent !text-fg-subtle hover:!text-fg [&>svg]:!size-3",
              },
            }}
          />
        </BrowserRouter>
      </DAppKitProvider>
    </QueryClientProvider>
  );
}
