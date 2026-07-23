// Real on-chain swap on Arc Testnet via Circle App Kit Swap.
// User-controlled adapter: the swap SDK builds and signs each transaction
// through the connected browser wallet (EIP-1193). No server-side wallet,
// no shared "house" pool — the end user approves + submits from their own
// address, same as any DEX flow.
//
// Docs: https://docs.arc.network/app-kit/swap

export type Token = {
  symbol: string;         // display symbol
  swapSymbol: string;     // SDK-registered symbol (USDC / EURC / CIRBTC / NATIVE)
  name: string;
  decimals: number;
  color: string;
  address: string;        // Arc Testnet ERC-20 address (checksummed)
};

export const ARC_TESTNET_CHAIN_ID_HEX = "0x4CEF52"; // 5042002
export const ARC_TESTNET_CHAIN_ID = 5042002;

// Arc Testnet token addresses (from Circle App Kit Swap chain registry).
export const TOKENS: Token[] = [
  {
    symbol: "USDC",
    swapSymbol: "USDC",
    name: "USD Coin (native)",
    decimals: 6,
    color: "bg-blue-500",
    address: "0x3600000000000000000000000000000000000000",
  },
  {
    symbol: "EURC",
    swapSymbol: "EURC",
    name: "Euro Coin",
    decimals: 6,
    color: "bg-indigo-500",
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  },
  {
    symbol: "cirBTC",
    swapSymbol: "CIRBTC",
    name: "Circle Bitcoin",
    decimals: 8,
    color: "bg-orange-500",
    address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
  },
];

export type Quote = {
  amountIn: string;
  amountOut: string;   // expected output (human decimal)
  stopLimit: string;   // minimum received after slippage
  rate: number;
  fees: { token: string; amount: string; type?: string }[];
  route: string;
};

export type SwapExecResult = {
  txHash: string;
  explorerUrl?: string;
  amountOut?: string;
};

const ARC_CHAIN_PARAMS = {
  chainId: ARC_TESTNET_CHAIN_ID_HEX,
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network/"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

type Eip1193 = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEth(): Eip1193 {
  const eth = (typeof window !== "undefined"
    ? (window as unknown as { ethereum?: Eip1193 }).ethereum
    : undefined);
  if (!eth) throw new Error("No wallet detected");
  return eth;
}

/** Switch (or add) the wallet to Arc Testnet. */
export async function switchToArcTestnet(): Promise<void> {
  const eth = getEth();
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET_CHAIN_ID_HEX }],
    });
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [ARC_CHAIN_PARAMS],
      });
    } else {
      throw e;
    }
  }
}

// Lazy import so @circle-fin/swap-kit + @solana/web3.js never enter the SSR graph.
async function loadKit() {
  const [{ createSwapKitContext, estimate, swap, SwapChain }, { createViemAdapterFromProvider }] =
    await Promise.all([
      import("@circle-fin/swap-kit"),
      import("@circle-fin/adapter-viem-v2"),
    ]);
  return { createSwapKitContext, estimate, swap, SwapChain, createViemAdapterFromProvider };
}

async function buildAdapter() {
  const eth = getEth();
  await switchToArcTestnet();
  const { createViemAdapterFromProvider } = await loadKit();
  // user-controlled: uses the connected account, addresses forbidden in params
  const adapter = await createViemAdapterFromProvider({
    provider: eth as unknown as Parameters<typeof createViemAdapterFromProvider>[0]["provider"],
    capabilities: { addressContext: "user-controlled" },
  });
  return adapter;
}

const KIT_KEY = (typeof import.meta !== "undefined"
  ? (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CIRCLE_KIT_KEY
  : undefined);

export async function getQuote(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
): Promise<Quote> {
  if (tokenIn.symbol === tokenOut.symbol) throw new Error("Choose two different tokens");
  const amt = Number(amountIn);
  if (!amt || amt <= 0) throw new Error("Enter an amount");

  const { createSwapKitContext, estimate, SwapChain } = await loadKit();
  const adapter = await buildAdapter();
  const ctx = createSwapKitContext();

  const est = await estimate(ctx, {
    from: { adapter, chain: SwapChain.Arc_Testnet },
    tokenIn: tokenIn.swapSymbol,
    tokenOut: tokenOut.swapSymbol,
    amountIn: String(amt),
    config: {
      slippageBps: 300,
      allowanceStrategy: "permit",
      ...(KIT_KEY ? { kitKey: KIT_KEY } : {}),
    },
  });

  const out = Number(est.estimatedOutput?.amount ?? "0");
  return {
    amountIn: String(amt),
    amountOut: est.estimatedOutput?.amount ?? "0",
    stopLimit: est.stopLimit?.amount ?? "0",
    rate: out / amt,
    fees: (est.fees ?? []).map((f) => ({ token: f.token, amount: f.amount, type: (f as { type?: string }).type })),
    route: `${tokenIn.symbol} → ${tokenOut.symbol} (Circle Swap · Arc Testnet)`,
  };
}

export async function executeSwap(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
): Promise<SwapExecResult> {
  const { createSwapKitContext, swap, SwapChain } = await loadKit();
  const adapter = await buildAdapter();
  const ctx = createSwapKitContext();

  const result = await swap(ctx, {
    from: { adapter, chain: SwapChain.Arc_Testnet },
    tokenIn: tokenIn.swapSymbol,
    tokenOut: tokenOut.swapSymbol,
    amountIn: String(amountIn),
    config: {
      slippageBps: 300,
      allowanceStrategy: "permit",
      ...(KIT_KEY ? { kitKey: KIT_KEY } : {}),
    },
  });

  const explorer = result.txHash
    ? `https://testnet.arcscan.app/tx/${result.txHash}`
    : undefined;
  return { txHash: result.txHash, explorerUrl: explorer, amountOut: result.amountOut };
}
