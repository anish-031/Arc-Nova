// Real 3-token swap on Base mainnet via Uniswap.
// Quotes: live USD prices from CoinGecko for the on-screen preview.
// Execution: switch the connected wallet to Base and open Uniswap's swap
// widget with the exact input/output tokens + amount pre-filled so the
// user signs the real on-chain trade in their wallet.

export type Token = {
  symbol: string;
  name: string;
  coingeckoId: string;
  decimals: number;
  color: string;
  /** Base mainnet ERC-20 address (checksummed) */
  address: string;
};

export const BASE_CHAIN_ID_HEX = "0x2105"; // 8453

// Base mainnet token addresses
export const TOKENS: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    coingeckoId: "usd-coin",
    decimals: 6,
    color: "bg-blue-500",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  {
    symbol: "EURC",
    name: "Euro Coin",
    coingeckoId: "euro-coin",
    decimals: 6,
    color: "bg-indigo-500",
    address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
  },
  {
    symbol: "cBTC",
    name: "Coinbase Wrapped BTC",
    coingeckoId: "coinbase-wrapped-btc",
    decimals: 8,
    color: "bg-orange-500",
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  },
];

const SWAP_FEE = 0.003; // 0.3% indicative Uniswap fee

let priceCache: { at: number; prices: Record<string, number> } | null = null;

async function getPricesUSD(): Promise<Record<string, number>> {
  if (priceCache && Date.now() - priceCache.at < 30_000) return priceCache.prices;
  const ids = TOKENS.map((t) => t.coingeckoId).join(",");
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
  if (!r.ok) throw new Error("Failed to fetch prices");
  const j = (await r.json()) as Record<string, { usd: number }>;
  const prices: Record<string, number> = {};
  for (const t of TOKENS) {
    // fallback: bitcoin id if cbBTC id is unavailable in coingecko simple endpoint
    prices[t.symbol] = j[t.coingeckoId]?.usd ?? (t.symbol === "cBTC" ? (j["bitcoin"]?.usd ?? 0) : 0);
  }
  priceCache = { at: Date.now(), prices };
  return prices;
}

export type Quote = {
  amountIn: string;
  amountOut: string;
  rate: number;
  fee: number;
  priceIn: number;
  priceOut: number;
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
    route: `${tokenIn.symbol} → ${tokenOut.symbol} (Uniswap · Base)`,
  };
}

/** Ask the connected wallet to switch to (or add) Base mainnet. */
export async function switchToBase(): Promise<void> {
  const eth = (typeof window !== "undefined" ? (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum : undefined);
  if (!eth) throw new Error("No wallet detected");
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_CHAIN_ID_HEX }] });
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BASE_CHAIN_ID_HEX,
          chainName: "Base",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        }],
      });
    } else {
      throw e;
    }
  }
}

/** Build a Uniswap swap URL on Base with tokens + amount pre-filled. */
export function uniswapSwapUrl(tokenIn: Token, tokenOut: Token, amountIn: string): string {
  const params = new URLSearchParams({
    chain: "base",
    inputCurrency: tokenIn.address,
    outputCurrency: tokenOut.address,
    exactAmount: String(amountIn),
    exactField: "input",
  });
  return `https://app.uniswap.org/swap?${params.toString()}`;
}
