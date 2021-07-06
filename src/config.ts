import { NetworkType } from "@airgap/beacon-sdk";

enum Network {
  MAINNET,
  FLORENCENET,
  SANDBOX,
}

const config = {
  network: NetworkType.MAINNET,
  rpcUrl: "https://rpc.tzbeta.net",
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
};

const network = Network.SANDBOX;

switch (network as Network) {
  case Network.MAINNET:
    config.rpcUrl = "https://mainnet-tezos.giganode.io/";
    config.network = NetworkType.MAINNET;
    break;
  case Network.FLORENCENET:
    config.rpcUrl = "https://testnet-tezos.giganode.io/";
    config.network = NetworkType.FLORENCENET;
    break;
  case Network.SANDBOX:
    config.rpcUrl = "http://localhost:8732/";
    config.network = NetworkType.CUSTOM;
    break;
}

export default config;
