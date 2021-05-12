import { NetworkType } from "@airgap/beacon-sdk";

const config = {
  network: NetworkType.MAINNET,
  rpcUrl: "https://rpc.tzbeta.net",
  swapContractAddress: "KT1F3BqwEAoa2koYX4Hz7zJ8xfGSxxAGVT8t",
  defaultTezPrice: {
    last_updated_at: 1620838463,
    usd: 6.59,
    usd_24h_change: -3.8881369888056683,
    usd_24h_vol: 652595323.7587972,
    usd_market_cap: 5442439071.393763,
  },
  defaultTokenPrice: {
    last_updated_at: 1620838463,
    usd: 0.00012,
    usd_24h_change: 3240,
    usd_24h_vol: 0,
    usd_market_cap: 0,
  }
}

export default config;