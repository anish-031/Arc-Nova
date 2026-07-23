// Real Uniswap quote integration via their public trading API.
// This is the same endpoint the uniswap.org interface uses.

export type Token = {
  symbol: string;
  name: string;
  address: string; // checksum on Ethereum mainnet, or "NATIVE" for ETH
  decimals: number;
  chainId: 1;
  logo?: string;
};

// Curated Ethereum mainnet tokens (Uniswap-verified).
export const TOKENS: Token[] = [
  { symbol: "ETH",  name: "Ether",             address: "NATIVE",                                     decimals: 18, chainId: 1 },
  { symbol: "USDC", name: "USD Coin",          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6,  chainId: 1 },
  { symbol: "USDT", name: "Tether",            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6,  chainId: 1 },
  { symbol: "DAI",  name: "Dai",               address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, chainId: 1 },
  { symbol: "WBTC", name: "Wrapped Bitcoin",   address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8,  chainId: 1 },
  { symbol: "WETH", name: "Wrapped Ether",     address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, chainId: 1 },
  { symbol: "UNI",  name: "Uniswap",           address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18, chainId: 1 },
  { symbol: "LINK", name: "Chainlink",         address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18, chainId: 1 },
  { symbol: "ARB",  name: "Arbitrum",          address: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1", decimals: 18, chainId: 1 },
  { symbol: "PEPE", name: "Pepe",              address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", decimals: 18, chainId: 1 },
];

const UNIV3_QUOTER = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"; // QuoterV2 mainnet
const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

// Use public Ethereum JSON-RPC (Cloudflare's free endpoint — no key needed)
const RPC = "https://cloudflare-eth.com";

function tokenAddrForQuote(t: Token) {
  return t.address === "NATIVE"
    ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" // WETH
    : t.address;
}

function encodeAddress(addr: string) {
  return addr.toLowerCase().replace("0x", "").padStart(64, "0");
}
function encodeUint(value: bigint) {
  return value.toString(16).padStart(64, "0");
}

// quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96))
// selector 0xc6a5026a
function encodeQuoteCall(tokenIn: string, tokenOut: string, amountIn: bigint, fee: number) {
  const selector = "c6a5026a";
  const data =
    encodeAddress(tokenIn) +
    encodeAddress(tokenOut) +
    encodeUint(amountIn) +
    encodeUint(BigInt(fee)) +
    encodeUint(0n);
  return "0x" + selector + data;
}

async function rpcCall(data: string) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: UNIV3_QUOTER, data }, "latest"],
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  return j.result as string;
}

export type Quote = {
  amountIn: string;      // human
  amountOut: string;     // human
  rate: number;          // out per 1 in
  feeTier: number;       // e.g. 3000
  route: string;         // display string
  raw: { amountInWei: bigint; amountOutWei: bigint };
};

export async function getQuote(tokenIn: Token, tokenOut: Token, amountIn: string): Promise<Quote> {
  const amt = Number(amountIn);
  if (!amt || amt <= 0) throw new Error("Enter an amount");
  const amountInWei = BigInt(Math.floor(amt * 10 ** tokenIn.decimals));
  const inAddr = tokenAddrForQuote(tokenIn);
  const outAddr = tokenAddrForQuote(tokenOut);
  if (inAddr.toLowerCase() === outAddr.toLowerCase()) throw new Error("Same token");

  let best = { out: 0n, fee: 0 };
  for (const fee of FEE_TIERS) {
    try {
      const res = await rpcCall(encodeQuoteCall(inAddr, outAddr, amountInWei, fee));
      // QuoterV2 returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)
      const outHex = res.slice(2, 66);
      const out = BigInt("0x" + outHex);
      if (out > best.out) best = { out, fee };
    } catch {
      // pool doesn't exist at this tier
    }
  }
  if (best.out === 0n) throw new Error("No Uniswap V3 pool for this pair");

  const amountOut = Number(best.out) / 10 ** tokenOut.decimals;
  return {
    amountIn: String(amt),
    amountOut: amountOut.toString(),
    rate: amountOut / amt,
    feeTier: best.fee,
    route: `${tokenIn.symbol} → ${tokenOut.symbol} (${best.fee / 10000}% pool)`,
    raw: { amountInWei, amountOutWei: best.out },
  };
}

// Build a link that opens Uniswap web app with the trade pre-filled
export function uniswapAppUrl(tokenIn: Token, tokenOut: Token, amountIn: string) {
  const inParam = tokenIn.address === "NATIVE" ? "ETH" : tokenIn.address;
  const outParam = tokenOut.address === "NATIVE" ? "ETH" : tokenOut.address;
  return `https://app.uniswap.org/swap?chain=mainnet&inputCurrency=${inParam}&outputCurrency=${outParam}&exactAmount=${amountIn}&exactField=input`;
}

// Switch injected wallet to Ethereum mainnet
export async function switchToMainnet() {
  const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) throw new Error("No wallet detected");
  await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x1" }] });
}
