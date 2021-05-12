import React, { useState, Dispatch, SetStateAction, useEffect } from "react";
import { TezosToolkit, WalletContract } from "@taquito/taquito";

interface ExchangeFormProps {
  contract: WalletContract | any;
  setUserBalance: Dispatch<SetStateAction<any>>;
  Tezos: TezosToolkit;
  userAddress: string;
  setStorage: Dispatch<SetStateAction<number>>;
  storage: any;
}

interface CoinGeckoPrice {
  last_updated_at: number;
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
  usd_market_cap: number;
}

const ExchangeForm = ({ contract, setUserBalance, Tezos, userAddress, setStorage, storage }: ExchangeFormProps) => {

  const [tezUsd, setTezUsd] = useState<CoinGeckoPrice>({
    last_updated_at: 1620838463,
    usd: 6.59,
    usd_24h_change: -3.8881369888056683,
    usd_24h_vol: 652595323.7587972,
    usd_market_cap: 5442439071.393763,
  });
  const [tokenUsd, setTokenUsd] = useState<CoinGeckoPrice>({
    last_updated_at: 1620838463,
    usd: 0.00012,
    usd_24h_change: 3240,
    usd_24h_vol: 0,
    usd_market_cap: 0,
  });
  const [tezPool, setTezPool] = useState<number>(0);
  const [tokenPool, setTokenPool] = useState<number>(0);

  const [amountTez, setAmountTez] = useState<number>(0);
  const [amountTezDollar, setAmountTezDollar] = useState<number>(0);
  const [amountToken, setAmountToken] = useState<number>(0);
  const [amountTokenDollar, setAmountTokenDollar] = useState<number>(0);

  const [loadingBuy, setLoadingBuy] = useState<boolean>(false);

  const fee = 0.003;
  const maxSlippage = 0.005;
  const tezMultiplyer = 10**6;
  const tokenMultiplyer = 10**8;

  // https://www.coingecko.com/en/api#explore-api
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=tezos&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true")
      .then(res => res.json())
      .then(res => setTezUsd(res.tezos))
  }, [])

  // set pool size
  useEffect(() => {
    if (storage) {
      setTezPool(storage.storage.tez_pool.toNumber() / tezMultiplyer);
      setTokenPool(storage.storage.token_pool.toNumber() / tokenMultiplyer);
    }
  }, [storage])

  //
  useEffect(() => {
    if (tezPool && tokenPool) {
      const tokenUsdNew = tokenUsd;
      tokenUsdNew.usd = tezPool / tokenPool * tezUsd.usd
      setTokenUsd(tokenUsdNew)
    }
  }, [tezPool, tokenPool, tezUsd])

  // initial value
  useEffect(() => {
    if (tezPool && tokenPool) {
      userChangeTez(1)
    }
  }, [tezPool, tokenPool])


  // handle user changes
  function onChangeTez(event: any) { // ChangeEvent<HTMLInputElement>
    userChangeTez(parseFloat(event.target.value) || 0)
  }
  function userChangeTez(amount_tez: number) {
    // b = 0.97 * a * y/(x + 0.97 * a)
    let amount_token = (1-fee) * amount_tez * tokenPool / (tezPool + (1-fee) * amount_tez);
    amount_token = Math.round(amount_token * tokenMultiplyer) / tokenMultiplyer;
    console.log(amount_token)
    setAmountTez(amount_tez);
    setAmountTezDollar(amount_tez * tezUsd.usd)
    setAmountToken(amount_token);
    setAmountTokenDollar(amount_token * tokenUsd.usd);
  }
  function onChangeToken(event: any) { // ChangeEvent<HTMLInputElement>
    userChangeToken(parseFloat(event.target.value) || 0)
  }
  function userChangeToken(amount_token: number) {
    // b = 0.97 * a * y/(x + 0.97 * a)
    let amount_tez = (1-fee) * amount_token * tezPool / (tokenPool + (1-fee) * amount_token);
    amount_tez = Math.round(amount_tez * tezMultiplyer) / tezMultiplyer;

    setAmountTez(amount_tez);
    setAmountTezDollar(amount_tez * tezUsd.usd)
    setAmountToken(amount_token);
    setAmountTokenDollar(amount_token * tokenUsd.usd);
  }

  // trigger buy
  const buy = async (): Promise<void> => {
    setLoadingBuy(true);
    try {
      const minToken = Math.round(amountToken * tokenMultiplyer * (1 - maxSlippage));
      console.log(amountTez, minToken)
      const op = await contract.methods.tezToTokenPayment(minToken, userAddress).send({
        storageLimit: 0,
        amount: amountTez * tezMultiplyer,
        mutez: true,
      });
      await op.confirmation();
      const newStorage: any = await contract.storage();
      if (newStorage) setStorage(newStorage);
      setUserBalance(await Tezos.tz.getBalance(userAddress));
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingBuy(false);
    }
  };

  return (
    <div className="form-grid-vertical">
      <div className="form-row form-row-last">
        <div className="w-layout-grid grid-4">
          <div className="div-block-11">
            <input 
              type="number" 
              className="form-input form-input-large currency w-input"
              name="Input-Currency"
              data-name="Input Currency"
              placeholder="0,00"
              id="Input-Currency"
              step="1"
              value={amountTez}
              onChange={(e) => onChangeTez(e)} 
              required
            />
            <a href="#" className="link-block">$</a>
            <div className="text-currency">~${amountTezDollar.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="div-block-12">
              <div className="image-8">
                <img loading="lazy" alt="" className="image-9" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/6091079111aa5a643419586e_icon-arrow-down.svg" />
              </div>
            </div>
          </div>
          <div id="w-node-_15a9de31-66d8-0b4b-3b7b-19a314a9d940-856d06c6" className="div-block-8">
            <div className="div-block-9">
              <div className="div-block-10">
                <img loading="lazy" alt="" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/609bdfbc8ef4b38115354a8e_2011.png" />
              </div>
              <div>
                <div className="small-text">
                  Tezos <span className="inline-badge-medium">XTC</span>
                </div>
                <div className="small-text crypto-price">
                  ~${tezUsd.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  &nbsp;
                  { tezUsd.usd_24h_change < 0 && 
                    <span className="inline-badge-medium red">↓ {tezUsd.usd_24h_change.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                  }
                  { tezUsd.usd_24h_change > 0 && 
                    <span className="inline-badge-medium green">↑ {tezUsd.usd_24h_change.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                  }
                </div>
              </div>
            </div>
          </div>
          <div className="div-block-11">
            <input
              type="number"
              className="form-input form-input-large currency w-input"
              name="Output-Currency"
              data-name="Output Currency"
              placeholder="0.00"
              id="Output-Currency"
              step="1"
              value={amountToken}
              onChange={(e) => onChangeToken(e)} 
              required
            />
            <div className="text-currency">~${amountTokenDollar.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div id="w-node-_15a9de31-66d8-0b4b-3b7b-19a314a9d949-856d06c6" className="div-block-8">
            <div className="div-block-9">
              <div className="div-block-10">
                <img loading="lazy" alt="" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/6092c567e1dfe71a28c3c339_1_ZdaWerzN9F7oIyhZEwcRqQ.jpeg" />
              </div>
              <div>
                <div className="small-text">
                  Cerveza <span className="inline-badge-medium">cvza</span>
                </div>
                <div className="small-text crypto-price">
                ~${tokenUsd.usd.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                  &nbsp;
                  { tokenUsd.usd_24h_change < 0 && 
                    <span className="inline-badge-medium red">↓ {tokenUsd.usd_24h_change.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                  }
                  { tokenUsd.usd_24h_change > 0 && 
                    <span className="inline-badge-medium green">↑ {tokenUsd.usd_24h_change.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                  }
                </div>
              </div>
            </div>
          </div>

          { /* Submit */ }
          {userAddress &&
            <input type="submit" value="Buy CVZA" onClick={buy} data-wait="Please wait..." id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" className="button long-submit-button bg-primary-4 w-button" />
          }
        </div>
      </div>
    </div>
  )
}

export default ExchangeForm;