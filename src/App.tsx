import React, { useEffect, useCallback, useState } from "react";
import { TezosToolkit } from "@taquito/taquito";
// import "./App.css";
import ConnectButton from "./components/ConnectWallet";
import DisconnectButton from "./components/DisconnectWallet";
import qrcode from "qrcode-generator";
import ExchangeForm from './components/ExchangeForm';
import config from './config';
import Publish from './publish';
import PriceChart from './PriceChart';
import { bytes2Char } from '@taquito/utils';

interface AppProps {
  swapContract: string
}

const App = ({ swapContract }: AppProps) => {
  const [Tezos, setTezos] = useState<TezosToolkit>(
    new TezosToolkit(config.rpcUrl)
  );
  const [contract, setContract] = useState<any>(undefined);
  const [publicToken, setPublicToken] = useState<string | null>("");
  const [wallet, setWallet] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [userBalance, setUserBalance] = useState<number>(-1);
  const [userTokenBalance, setUserTokenBalance] = useState<number>(-1);
  const [storage, setStorage] = useState<any>();
  const [copiedPublicToken, setCopiedPublicToken] = useState<boolean>(false);
  const [beaconConnection, setBeaconConnection] = useState<boolean>(false);
  const [showTokenomics, setShowTokenomics] = useState<boolean>(false);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);
  const [tokenDetails, setTokenDetails] = useState<any>();

  // creates contract instance
  useEffect(() => {
    async function initContract() {
      const newContract = await Tezos.wallet.at(swapContract);
      const newStorage: any = await newContract.storage();
      setContract(newContract);
      setStorage(newStorage);
      initTokenContract(newStorage.storage.token_address)
    }

    async function initTokenContract(coinContract: string) {
      try {
        const newContract = await Tezos.wallet.at(coinContract);
        const newStorage: any = await newContract.storage();
        const metdata: any = await newStorage.assets.token_metadata.get(0);
        const tokenDetails = {
          totalSupply: parseInt(newStorage.assets.total_supply),
          name: bytes2Char(metdata['token_info'].get('name')),
          symbol: bytes2Char(metdata['token_info'].get('symbol')),
          description: bytes2Char(metdata['token_info'].get('description')),
          thumbnailUri: bytes2Char(metdata['token_info'].get('thumbnailUri')),
          decimals: parseInt(bytes2Char(metdata['token_info'].get('decimals'))),
          shouldPreferSymbol: bytes2Char(metdata['token_info'].get('shouldPreferSymbol')) === 'true',
          coinContractAddress: coinContract,
          swapContractAddress: swapContract,
        }
        setTokenDetails(tokenDetails)
      } catch (e) {
        console.error(e)
      }
    }

    initContract()
  }, [Tezos.wallet, swapContract])

  // update balances
  const updateTokenBalance = useCallback(() => {
    if (userAddress && tokenDetails) {
      const url = `https://api.better-call.dev/v1/account/${config.network}/${userAddress}/token_balances`
      fetch(url)
        .then(res => res.json())
        .then(data => data.balances.find((coin: any) => coin.contract === tokenDetails.coinContractAddress))
        .then(coin => {
          if (coin) {
            setUserTokenBalance(parseInt(coin.balance) / 10**coin.decimals);
          } else {
            setUserTokenBalance(0);
          }
        })
    } else {
      setUserTokenBalance(-1);
    }
  }, [setUserTokenBalance, userAddress, tokenDetails])
  const updateBalance = useCallback(async () => {
    if (userAddress) {
      try {
        const balance = await Tezos.tz.getBalance(userAddress);
        setUserBalance(balance.toNumber() / 10**6);
      } catch (e) {
        console.warn(e)
      }
    } else {
      setUserBalance(-1);
    }
  }, [setUserBalance, userAddress, Tezos.tz])
  useEffect(() => {
    updateBalance()
    updateTokenBalance()
  }, [userAddress, updateTokenBalance, updateBalance])
  useEffect(() => {
    if (userTokenBalance !== -1) {
      Publish.userTokenBalance(userTokenBalance, tokenDetails?.symbol);
    }
  }, [userTokenBalance, tokenDetails])
  useEffect(() => {
    if (userBalance !== -1) {
      Publish.userBalance(userBalance);
    }
  }, [userBalance])
  useEffect(() => {
    const interval = setInterval(() => {
      updateBalance()
      updateTokenBalance()
    }, 10000);
    return () => clearInterval(interval);
  }, [updateBalance, updateTokenBalance]);

  const generateQrCode = (): { __html: string } => {
    const qr = qrcode(0, "L");
    qr.addData(publicToken || "");
    qr.make();

    return { __html: qr.createImgTag(4) };
  };

  return (
    <div className="card bg-primary-1">
      <div className="card-body">
        <div className="form-block content-width-large align-center w-form">
          <div className="space-bottom">
            <h3 className="heading no-space-bottom">Buy ${tokenDetails?.symbol}</h3>
            { userTokenBalance === -1 &&
              <div id="current-token" className="large-text">
                Connect your wallet to see your balance and trade
              </div>
            }
            { userTokenBalance !== -1 &&
              <div id="current-token" className="large-text">
                Your are currently holding <span className="inline-badge">{userTokenBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> ${tokenDetails?.symbol}
              </div>
            }
          </div>
          <div className="form-grid-vertical">
            <div className="form-row form-row-last">
              <div className="w-layout-grid grid-4">
                <ExchangeForm
                  contract={contract}
                  tokenDetails={tokenDetails}
                  updateUserBalance={updateBalance}
                  updateUserTokenBalance={updateTokenBalance}
                  Tezos={Tezos}
                  userAddress={userAddress}
                  userBalance={userBalance}
                  setStorage={setStorage}
                  storage={storage}
                />

                {!userAddress &&
                  <ConnectButton
                    Tezos={Tezos}
                    setPublicToken={setPublicToken}
                    setWallet={setWallet}
                    setUserAddress={setUserAddress}
                    setBeaconConnection={setBeaconConnection}
                    wallet={wallet}
                  />
                }

                { /* Disconnect */}
                {userAddress &&
                  <DisconnectButton
                    wallet={wallet}
                    setPublicToken={setPublicToken}
                    setUserAddress={setUserAddress}
                    setWallet={setWallet}
                    setTezos={setTezos}
                    setBeaconConnection={setBeaconConnection}
                  />
                }
                </div>

                <div>
                  <div className="accordion-group exception-buycvza">
                    <div className="accordion-title-panel exception-buycerveza" onClick={() => setShowTokenomics(!showTokenomics)}>
                      <h5 className="small-text">Tokenomics</h5>
                      <img 
                        alt=""
                        className="accordion-arrow"
                        src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/6091079111aa5ad8b31958a5_icon-chevron-right.svg"
                        style={{transform: showTokenomics ? 'rotateZ(90deg)' : 'rotateZ(0deg)', transformStyle: 'preserve-3d', transition: 'transform 200ms'}}
                      />
                    </div>
                    <div className="accordion-content" style={{display: showTokenomics ? 'block' : 'none', opacity: 1}}>
                      <div>
                        <div>
                          <div className="grid-halves full-width">
                            <div id="w-node-_2bc1ab25-9a15-d706-5153-310495f51bfc-856d06c6">Contract</div>
                            <div className="tiny-text">{tokenDetails?.coinContractAddress}</div>
                          </div>
                          <div className="grid-halves full-width">
                            <div id="w-node-_2bc1ab25-9a15-d706-5153-310495f51c01-856d06c6">DEX LP Contract</div>
                            <div className="tiny-text">{tokenDetails?.swapContractAddress}</div>
                          </div>
                          <div className="grid-halves full-width">
                            <div id="w-node-_2bc1ab25-9a15-d706-5153-310495f51c06-856d06c6">Total Supply</div>
                            <div className="small-text">{tokenDetails?.totalSupply?.toLocaleString()}</div>
                          </div>
                          <div className="grid-halves full-width">
                            <div id="w-node-_2bc1ab25-9a15-d706-5153-310495f51c0b-856d06c6">Price per USD</div>
                            <div className="price-per-usd">N/A</div>
                          </div>
                          <div className="grid-halves full-width">
                            <div id="w-node-_2bc1ab25-9a15-d706-5153-310495f51c10-856d06c6">Price per Tezos</div>
                            <div className="price-per-tez">N/A</div>
                          </div>
                          <div className="grid-halves full-width space-bottom">
                            <div id="w-node-_2bc1ab25-9a15-d706-5153-310495f51c15-856d06c6">Price Change 24h</div>
                            <div className="price-change-24h">N/A</div>
                          </div>
                        </div>
                        <div className="graph-wrapper">
                          <div className="graph-svg">
                            { tokenDetails &&
                              <PriceChart
                                swapContractAddress={tokenDetails.swapContractAddress}
                                tokenDecimals={tokenDetails.decimals}
                              />
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="accordion-group exception-buycvza">
                    <div className="accordion-title-panel exception-buycerveza" onClick={() => setShowDisclaimer(!showDisclaimer)}>
                      <h5 className="small-text">Disclaimer</h5>
                      <img
                        alt=""
                        className="accordion-arrow"
                        src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/6091079111aa5ad8b31958a5_icon-chevron-right.svg"  
                        style={{transform: showDisclaimer ? 'rotateZ(90deg)' : 'rotateZ(0deg)', transformStyle: 'preserve-3d', transition: 'transform 200ms'}}
                      />
                    </div>
                    <div className="accordion-content" style={{display: showDisclaimer ? 'block' : 'none', opacity: 1}}>
                      <div><p>
                        The rates displayed by the calculator represent market exchange rates, and are provided for informational and estimation purposes only. They do not include any conversion fees or other charges applicable to a conversion or other transaction. The calculator is based on a third party service, the Company and its affiliates accept no responsibility for the contents or results of any calculations made using the calculator.
                        <br />
                      </p></div>
                    </div>
                  </div>
                </div>
              
            </div>
          </div>

          { /* Connecting */}
          {false && publicToken && (!userAddress || isNaN(userBalance)) &&
            <div id="content">
              <p className="text-align-center">
                <i className="fas fa-broadcast-tower"></i>&nbsp; Connecting to your wallet
                </p>
              <div
                dangerouslySetInnerHTML={generateQrCode()}
                className="text-align-center"
              ></div>
              <p id="public-token">
                {copiedPublicToken ? (
                  <span id="public-token-copy__copied">
                    <i className="far fa-thumbs-up"></i>
                  </span>
                ) : (
                  <span
                    id="public-token-copy"
                    onClick={() => {
                      if (publicToken) {
                        navigator.clipboard.writeText(publicToken);
                        setCopiedPublicToken(true);
                        setTimeout(() => setCopiedPublicToken(false), 2000);
                      }
                    }}
                  >
                    <i className="far fa-copy"></i>
                  </span>
                )}

                <span>
                  Public token: <span>{publicToken}</span>
                </span>
              </p>
              <p className="text-align-center">
                Status: {beaconConnection ? "Connected" : "Disconnected"}
              </p>
            </div>
          }

        </div>
      </div>
    </div>
  );
};

export default App;
