export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/reject|denied|cancel/i.test(message) && /user|wallet|sign/i.test(message)) {
    return "The transaction was rejected in your wallet. Try again.";
  }
  if (/insufficient|gas|balance/i.test(message)) {
    return "Not enough SUI to pay for gas. Top up your wallet and try again.";
  }
  const abort = message.match(/abort code: (\d+)/);
  if (abort) {
    const reasons: Record<string, string> = {
      "0": "Only the bidder can do that.",
      "1": "Wrong number of NFTs offered in return.",
      "2": "The bid asks for a specific NFT that wasn't included.",
      "3": "A bid must offer at least one NFT or some SUI.",
      "4": "A bid must request at least one NFT.",
      "5": "This bid has no target NFT, so it can't be rejected.",
      "6": "Only the owner of the requested NFT can reject this bid.",
    };
    return reasons[abort[1]] ?? "The contract rejected the transaction.";
  }
  return message.length > 160 ? `${message.slice(0, 157)}…` : message || "Something went wrong.";
}
