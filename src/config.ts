import { NetworkType } from "@airgap/beacon-sdk";

const network = 'florencenet';

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
  }
}

switch(network){
  case 'florencenet':
    config.rpcUrl = "https://florence-tezos.giganode.io/";
    config.network = NetworkType.FLORENCENET;
    break;
}

export default config;