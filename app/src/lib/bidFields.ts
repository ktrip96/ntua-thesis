// `Balance<SUI>` arrives from getObject as `{ value: "<mist>" }`.
export function parseOfferedSui(raw: unknown): string {
  if (raw == null) return "0";
  if (typeof raw === "string" || typeof raw === "number") return String(raw);
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    if (v == null) return "0";
    return String(v);
  }
  return "0";
}

export const MIST_PER_SUI = 1_000_000_000n;

export function mistToSui(mist: string | bigint): string {
  const n = typeof mist === "string" ? BigInt(mist || "0") : mist;
  if (n === 0n) return "0";
  const whole = n / MIST_PER_SUI;
  const frac = n % MIST_PER_SUI;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

export function suiStringToMist(sui: string): bigint {
  const trimmed = sui.trim();
  if (!trimmed) return 0n;
  if (!/^\d*\.?\d*$/.test(trimmed)) {
    throw new Error("Invalid SUI amount");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "000000000").slice(0, 9);
  const wholePart = BigInt(whole || "0") * MIST_PER_SUI;
  const fracPart = BigInt(fracPadded || "0");
  return wholePart + fracPart;
}

// `Option<ID>` is a plain string or null over JSON-RPC, but other transports
// wrap it as `{ some }`, `{ vec: [] }` or an `ID { bytes }` struct.
export function parseOptionalId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw || null;
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if ("some" in r) return parseOptionalId(r.some);
    if ("Some" in r) return parseOptionalId(r.Some);
    if (Array.isArray(r.vec)) return parseOptionalId(r.vec[0]);
    if ("bytes" in r) return parseOptionalId(r.bytes);
  }
  return null;
}

export function formatSui(mist: string | bigint): string {
  const s = mistToSui(mist);
  return s.includes(".") ? s : `${s}.0`;
}

export function offerSummary(nftCount: number, mist: string): string {
  const parts: string[] = [];
  if (nftCount > 0) parts.push(`${nftCount} NFT${nftCount === 1 ? "" : "s"}`);
  if (mist && mist !== "0") parts.push(`${formatSui(mist)} SUI`);
  return parts.length ? parts.join(" + ") : "nothing";
}
