/**
 * Arc Testnet network constants.
 * Source: https://docs.arc.io/arc/references/connect-to-arc
 *         https://docs.arc.io/arc/references/contract-addresses
 *
 * - Chain ID: 5042002  (0x4cef52)
 * - Native gas token: USDC (18 decimals on the native interface)
 * - ERC-20 USDC interface: 6 decimals (same underlying balance)
 *
 * A native `eth_sendTransaction` `value` therefore moves USDC directly
 * and is denominated in USDC-wei (1 USDC = 1e18).
 */
export const ARC_TESTNET = {
  chainId: 5042002,
  chainIdHex: "0x4cef52", // 5042002 in hex — MUST match wallet expectation
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
  faucet: "https://faucet.circle.com",
  currency: { name: "USDC", symbol: "USDC", decimals: 18 },
} as const;

export const STALE_ARC_CHAIN_ID_HEX = "0x4cf612";

export const STALE_ARC_NETWORK_MESSAGE =
  `Your wallet has an old Arc Testnet network saved with chain ID ${STALE_ARC_CHAIN_ID_HEX}. ` +
  `MetaMask blocks adding the corrected Arc network because it uses the same RPC. ` +
  `Delete Arc Testnet in MetaMask Settings → Networks, then reconnect. Correct chain ID: ${ARC_TESTNET.chainId} (${ARC_TESTNET.chainIdHex}).`;

export function isStaleArcNetworkError(error: unknown): boolean {
  const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
  return message.includes("same rpc endpoint") || message.includes(STALE_ARC_CHAIN_ID_HEX);
}

/** Native USDC gas token decimals on Arc. */
export const USDC_DECIMALS = 18;

/**
 * ERC-20 token contracts on Arc Testnet.
 * cBTC is not yet listed in the official Arc docs; address left empty
 * so the UI can render it as "coming soon" without breaking calls.
 */
export const ARC_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x3600000000000000000000000000000000000000",
    decimals: 6, // ERC-20 interface
    color: "bg-blue-500",
  },
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    decimals: 6,
    color: "bg-indigo-500",
  },
  cBTC: {
    symbol: "cBTC",
    name: "Circle Bitcoin",
    address: "", // not yet published on Arc Testnet
    decimals: 8,
    color: "bg-orange-500",
  },
} as const;
