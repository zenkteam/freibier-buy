import React, { useState, Dispatch, SetStateAction, useEffect } from "react";
import { TezosToolkit, WalletContract } from "@taquito/taquito";
import config from "./../config";
import Tracker from "../tracker";
import Publish from "../publish";

interface ExchangeFormProps {
  contract: WalletContract | any;
  tokenDetails: any;
  updateUserBalance: Function;
  updateUserTokenBalance: Function;
  Tezos: TezosToolkit;
  userAddress: string;
  userBalance: number;
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

const fee = 0.003;
const maxSlippage = 0.005;
const displayPositions = 2;

const ExchangeForm = ({ contract, tokenDetails, updateUserBalance, updateUserTokenBalance, Tezos, userAddress, userBalance, setStorage, storage }: ExchangeFormProps) => {

  const [tezUsd, setTezUsd] = useState<CoinGeckoPrice>(config.defaultTezPrice);
  const [tokenUsd, setTokenUsd] = useState<CoinGeckoPrice>(config.defaultTokenPrice);
  const [tokenTezPriceYesterday, setTokenTezPriceYesterday] = useState<number>(0);
  const [tezPool, setTezPool] = useState<number>(0);
  const [tokenPool, setTokenPool] = useState<number>(0);

  const [amountTez, setAmountTez] = useState<number>(0);
  const [amountTezDollar, setAmountTezDollar] = useState<number>(0);
  const [amountToken, setAmountToken] = useState<number>(0);
  const [amountTokenDollar, setAmountTokenDollar] = useState<number>(0);

  const [loadingBuy, setLoadingBuy] = useState<boolean>(false);
  const [useDollar, setUseDollar] = useState<boolean>(false);

  const tezMultiplyer = 10 ** 6;
  const tokenMultiplyer = 10 ** (tokenDetails?.decimals || 6);

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
  }, [storage, tezMultiplyer, tokenMultiplyer])

  // tez price
  useEffect(() => {
    if (tokenDetails) {
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - 1);
      const timestampString = timestamp.toISOString();
      const limit = 700; // max: 1000
      fetch(`https://api.tzkt.io/v1/contracts/${tokenDetails.swapContractAddress}/storage/history?limit=${limit}`)
        .then(res => res.json())
        .then(data => data.find((item: any) => item.timestamp < timestampString))
        .then(item => {
          if (item && item.value) {
            const tez_pool = parseFloat(item.value.storage.tez_pool) / tezMultiplyer;
            const token_pool = parseFloat(item.value.storage.token_pool) / tokenMultiplyer;
            const price_yesterday = tez_pool / token_pool;
            setTokenTezPriceYesterday(price_yesterday);
          }
        })
    }
  }, [tokenDetails, tezMultiplyer, tokenMultiplyer])

  // set 24 hours change for token price
  useEffect(() => {
    if (tokenTezPriceYesterday) {
      const tokenUsdNew = tokenUsd;
      tokenUsdNew.usd_24h_change = (tokenUsdNew.usd / (tokenTezPriceYesterday * tezUsd.usd) - 1) * 100;
      setTokenUsd(tokenUsdNew);
      Publish.tokenPriceChange(tokenUsdNew.usd_24h_change);
    }
  }, [tokenUsd, tokenUsd.usd, tokenTezPriceYesterday, tezUsd.usd])
  
  // token price update
  useEffect(() => {
    if (tezPool && tokenPool) {
      const tokenUsdNew = tokenUsd;
      tokenUsdNew.usd = tezPool / tokenPool * tezUsd.usd;
      setTokenUsd(tokenUsdNew);
      Publish.pricePerTez(tezPool / tokenPool);
      Publish.pricePerUsd(tokenUsdNew.usd);
    }
  }, [tezPool, tokenPool, tezUsd, tokenUsd])

  // initial value
  useEffect(() => {
    if (tezPool && tokenPool) {
      userChangeTez(1)
    }
    // eslint-disable-next-line
  }, [tezPool, tokenPool])


  // handle user changes
  function round(value: number, amount: number) {
    return Math.round(value * 10 ** amount) / 10 ** amount;
  }
  function setMaxTez() {
    userChangeTez(userBalance);
  }
  function onChangeTez(event: any) { // ChangeEvent<HTMLInputElement>
    userChangeTez(Math.abs(parseFloat(event.target.value)) || 0)
  }
  function userChangeTez(amount_tez: number) {
    // b = 0.997 * a * y/(x + 0.997 * a)
    const amount_token = round((1 - fee) * amount_tez * tokenPool / (tezPool + (1 - fee) * amount_tez), displayPositions);
    
    setAmountTez(amount_tez);
    setAmountTezDollar(round(amount_tez * tezUsd.usd, displayPositions))
    setAmountToken(amount_token);
    setAmountTokenDollar(amount_token * tokenUsd.usd);
  }
  function onChangeTezDollar(event: any) {
    userChangeTezDollar(Math.abs(parseFloat(event.target.value)) || 0)
  }
  function userChangeTezDollar(amount_tez_dollar: number) {
    amount_tez_dollar = round(amount_tez_dollar, displayPositions);
    const amount_tez = round(amount_tez_dollar / tezUsd.usd, displayPositions);

    // b = 0.997 * a * y/(x + 0.997 * a)
    const amount_token = round((1 - fee) * amount_tez * tokenPool / (tezPool + (1 - fee) * amount_tez), displayPositions);

    setAmountTez(amount_tez);
    setAmountTezDollar(amount_tez_dollar)
    setAmountToken(amount_token);
    setAmountTokenDollar(amount_token * tokenUsd.usd);
  }
  function onChangeToken(event: any) { // ChangeEvent<HTMLInputElement>
    userChangeToken(Math.abs(parseFloat(event.target.value)) || 0)
  }
  function userChangeToken(amount_token: number) {
    // b = 1.003 * a * y/(x - 1.003 * a)
    let amount_tez = round((1 + fee) * amount_token * tezPool / (tokenPool - (1 + fee) * amount_token), displayPositions);
    if (amount_tez < 0) {
      amount_tez = 0;
    }
    setAmountTez(amount_tez);
    setAmountTezDollar(amount_tez * tezUsd.usd)
    setAmountToken(amount_token);
    setAmountTokenDollar(amount_token * tokenUsd.usd);
  }

  // trigger buy
  const buy = async (): Promise<void> => {
    setLoadingBuy(true);
    Tracker.trackEvent('swap_start', {
      'XTZ': amountTez,
      [tokenDetails.symbol]: amountToken,
    });
    try {
      const minToken = Math.round(amountToken * tokenMultiplyer * (1 - maxSlippage));
      const op = await contract.methods.tezToTokenPayment(minToken, userAddress).send({
        storageLimit: 0,
        amount: amountTez * tezMultiplyer,
        mutez: true,
      });
      await op.confirmation();
      const newStorage: any = await contract.storage();
      if (newStorage) setStorage(newStorage);
      updateUserBalance();
      updateUserTokenBalance();
      Tracker.trackEvent('swap_success', {
        'XTZ': amountTez,
        [tokenDetails.symbol]: minToken,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingBuy(false);
    }
  };

  function getSubmitButton() {
    if (!userAddress) {
      // connect first
      return <></>;
    }
    if (loadingBuy) {
      return <input type="submit" value="Please confirm the transaction" onClick={buy} id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" className="button long-submit-button bg-primary-4 w-button" />;
    }

    if (!tezPool) {
      return <button id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" className="button long-submit-button w-button">Loading exchange rate</button>;
    }

    if (amountTez > userBalance) {
      return <input type="submit" value="Not enough funds" id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" className="button long-submit-button bg-primary-4 w-button" disabled style={{backgroundColor: '#ebebec'}} />;
    }

    if (!amountTez || !amountToken) {
      return <input type="submit" value={'Buy ' + tokenDetails?.symbol} id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" className="button long-submit-button bg-primary-4 w-button" disabled style={{backgroundColor: '#ebebec'}} />;
    }

    return <input type="submit" value={'Buy ' + tokenDetails?.symbol} onClick={buy} id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" className="button long-submit-button bg-primary-4 w-button" />;
  }

  return (
        <>
          <div id="w-node-_15a9de31-66d8-0b4b-3b7b-19a314a9d93b-856d06c6" className="div-block-11">

            {!useDollar &&
              <>
                <input
                  type="number"
                  className="form-input form-input-large currency w-input"
                  name="Input-Currency"
                  data-name="Input Currency"
                  placeholder="0.00"
                  id="Input-Currency"
                  step="1"
                  style={{'paddingRight': 60}}
                  value={amountTez || ''}
                  onChange={(e) => onChangeTez(e)}
                  required
                />
                <div
                  className="text-currency"
                  style={{'overflow': 'hidden', 'textOverflow': 'ellipsis', 'width': 168}}
                >
                  ~${amountTezDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </>
            }
            {useDollar &&
              <>
                <span className="dollar-sign" style={{position: 'absolute', left: 18, top: 10, color: '#141414'}}>$</span>
                <input
                  type="number"
                  className="form-input form-input-large currency w-input"
                  name="Input-Currency"
                  data-name="Input Currency"
                  placeholder="0.00"
                  id="Input-Currency"
                  step="1"
                  style={{paddingRight: 60, paddingLeft: 30}}
                  value={amountTezDollar || ''}
                  onChange={(e) => onChangeTezDollar(e)}
                  required
                />
                <div
                  className="text-currency"
                  style={{'overflow': 'hidden', 'textOverflow': 'ellipsis', 'width': 168}}
                >
                  ~{amountTez.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ꜩ
                </div>
              </>
            }

            <button className="link-block" style={{ backgroundColor: useDollar ? 'rgba(20,20,20,.5)' : '', color: useDollar ? 'white' : '', textAlign: 'center' }} onClick={() => setUseDollar(!useDollar)}>$</button>

            <div className="div-block-12">
              <div className="image-8">
                <img loading="lazy" alt="" className="image-9" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/6091079111aa5a643419586e_icon-arrow-down.svg" />
              </div>
            </div>
          </div>
          <div id="w-node-_15a9de31-66d8-0b4b-3b7b-19a314a9d940-856d06c6" className="div-block-8">
            <div className="div-block-9">
              <div className="div-block-10">
                <img loading="lazy" alt="" className="token-img" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/609bdfbc8ef4b38115354a8e_2011.png" />
              </div>
              <div>
                <div className="small-text exception-buying">
                  Tezos <span className="inline-badge-medium">XTZ</span>
                </div>
                <div className="small-text crypto-price">
                  ~${tezUsd.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  &nbsp;
                  {tezUsd.usd_24h_change < 0 &&
                    <span className="inline-badge-medium red">↓ {tezUsd.usd_24h_change.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                  }
                  {tezUsd.usd_24h_change > 0 &&
                    <span className="inline-badge-medium green">↑ {tezUsd.usd_24h_change.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                  }
                </div>
              </div>
              { userBalance > 0 &&
                <div onClick={() => setMaxTez()} style={{background: '#ebebec', color: 'rgba(20,20,20,.5)', borderRadius: 4, padding: '6px 6px 4px 6px', marginLeft: 'auto', fontSize: 10, lineHeight: 1, cursor: 'pointer'}}>MAX</div>
              }
            </div>
          </div>
          <div id="w-node-dfb2f49c-1a5d-d200-b5d5-9b7a746613e7-856d06c6" className="div-block-11">
            <input
              type="number"
              className="form-input form-input-large currency w-input"
              name="Output-Currency"
              data-name="Output Currency"
              placeholder="0.00"
              id="Output-Currency"
              step="10000"
              style={{paddingRight: 12}}
              value={amountToken || ''}
              onChange={(e) => onChangeToken(e)}
              required
            />
            <div
              className="text-currency"
              style={{'overflow': 'hidden', 'textOverflow': 'ellipsis', 'width': 216}}
            >
              ~${amountTokenDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div id="w-node-_15a9de31-66d8-0b4b-3b7b-19a314a9d949-856d06c6" className="div-block-8">
            <div className="div-block-9">
              <div className="div-block-10">
                <img loading="lazy" alt="" className="token-img" src={tokenDetails?.thumbnailUri} />
              </div>
              <div>
                <div className="small-text exception-buying">
                  {tokenDetails?.name} <span className="inline-badge-medium">{tokenDetails?.symbol}</span>
                </div>
                <div className="small-text crypto-price">
                  ~${tokenUsd.usd.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                  { tezUsd.usd_24h_change !== 0 && (tokenUsd.usd_24h_change > 0 || tokenUsd.usd_24h_change > tezUsd.usd_24h_change) &&
                    <>
                    &nbsp;
                    {tokenUsd.usd_24h_change < 0 &&
                      <span className="inline-badge-medium red">↓ {tokenUsd.usd_24h_change.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                    }
                    {tokenUsd.usd_24h_change > 0 &&
                      <span className="inline-badge-medium green">↑ {tokenUsd.usd_24h_change.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                    }
                    </>
                  }
                </div>
              </div>
            </div>
          </div>

          { /* Submit */}
          { getSubmitButton() }
        </>
  )
}

export default ExchangeForm;