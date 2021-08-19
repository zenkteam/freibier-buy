import { NetworkType } from "@airgap/beacon-sdk";

const config = {
  network: NetworkType.MAINNET,
  rpcUrl: "",
  defaultTezPrice: {
    last_updated_at: 1621264908,
    usd: 5.24,
    usd_24h_change: -10.701803732742505,
    usd_24h_vol: 410319278.74019855,
    usd_market_cap: 4367588701.058423,
  },
  defaultTokenPrice: {
    last_updated_at: 1621264908,
    usd: 0.0,
    usd_24h_change: 0,
    usd_24h_vol: 0,
    usd_market_cap: 0,
  },
  storageLimitSurcharge: 1.2, // multiplier
  lpTokenDecimals: 1000000
};

switch (config.network) {
  case NetworkType.MAINNET:
    config.rpcUrl = "https://mainnet.api.tez.ie";
    break;
  case NetworkType.FLORENCENET:
    config.rpcUrl = "https://rpc.florence.tzstats.com/";
    break;
  case NetworkType.CUSTOM:
    config.rpcUrl = "http://localhost:8732/";
    break;
}

export default config;
