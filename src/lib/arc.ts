/**
 * Arc Testnet network constants.
 * Source: https://docs.arc.io/arc/references/connect-to-arc
 *
 * Arc uses USDC as its native gas token with 18 decimals, so a native
 * eth_sendTransaction `value` is denominated in USDC-wei (1 USDC = 1e18).
 */
export const ARC_TESTNET = {
  chainId: 5042002,
  chainIdHex: "0x4cf612", // 5042002 in hex
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
  currency: { name: "USDC", symbol: "USDC", decimals: 18 },
} as const;

/** USDC has 18 decimals on Arc (native gas token), unlike 6 decimals on most chains. */
export const USDC_DECIMALS = 18;
