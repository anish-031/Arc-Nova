// Simple 3-token swap: USDC ↔ EURC ↔ cBTC.
// Live prices via CoinGecko (public, no key). Applies a 0.3% swap fee.

export type Token = {
  symbol: string;
  name: string;
  coingeckoId: string;
  decimals: number;
  color: string;
};

export const TOKENS: Token[] = [
  { symbol: "USDC", name: "USD Coin",      coingeckoId: "usd-coin",  decimals: 6, color: "bg-blue-500" },
  { symbol: "EURC", name: "Euro Coin",     coingeckoId: "euro-coin", decimals: 6, color: "bg-indigo-500" },
  { symbol: "cBTC", name: "Circle Bitcoin", coingeckoId: "bitcoin",  decimals: 8, color: "bg-orange-500" },
];

const SWAP_FEE = 0.003; // 0.3%

let priceCache: { at: number; prices: Record<string, number> } | null = null;

async function getPricesUSD(): Promise<Record<string, number>> {
  if (priceCache && Date.now() - priceCache.at < 30_000) return priceCache.prices;
  const ids = TOKENS.map((t) => t.coingeckoId).join(",");
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
  if (!r.ok) throw new Error("Failed to fetch prices");
  const j = (await r.json()) as Record<string, { usd: number }>;
  const prices: Record<string, number> = {};
  for (const t of TOKENS) prices[t.symbol] = j[t.coingeckoId]?.usd ?? 0;
  priceCache = { at: Date.now(), prices };
  return prices;
}

export type Quote = {
  amountIn: string;
  amountOut: string;
  rate: number;
  fee: number;      // human amount charged as fee (in tokenIn)
  priceIn: number;  // USD
  priceOut: number; // USD
  route: string;
};

export async function getQuote(tokenIn: Token, tokenOut: Token, amountIn: string): Promise<Quote> {
  const amt = Number(amountIn);
  if (!amt || amt <= 0) throw new Error("Enter an amount");
  if (tokenIn.symbol === tokenOut.symbol) throw new Error("Choose two different tokens");
  const prices = await getPricesUSD();
  const pIn = prices[tokenIn.symbol];
  const pOut = prices[tokenOut.symbol];
  if (!pIn || !pOut) throw new Error("Price feed unavailable");
  const fee = amt * SWAP_FEE;
  const usd = (amt - fee) * pIn;
  const amountOut = usd / pOut;
  return {
    amountIn: String(amt),
    amountOut: amountOut.toString(),
    rate: amountOut / amt,
    fee,
    priceIn: pIn,
    priceOut: pOut,
    route: `${tokenIn.symbol} → ${tokenOut.symbol}`,
  };
}
