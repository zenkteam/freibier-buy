import React, { useEffect, useCallback, useState } from "react";
import { TezosToolkit } from "@taquito/taquito";
// import "./App.css";
import ConnectButton from "./components/ConnectWallet";
import DisconnectButton from "./components/DisconnectWallet";
import qrcode from "qrcode-generator";
import ExchangeForm from './components/ExchangeForm';
import config from './config';
import Publish from './publish';

const App = () => {
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

  // creates contract instance
  useEffect(() => {
    async function initContract() {
      const newContract = await Tezos.wallet.at(config.swapContractAddress);
      const newStorage: any = await newContract.storage();
      setContract(newContract);
      setStorage(newStorage);
    }
    initContract()
  }, [Tezos.wallet])

  // update balances
  const updateTokenBalance = useCallback(() => {
    if (userAddress) {
      const url = `https://api.better-call.dev/v1/account/${config.network}/${userAddress}/token_balances`
      fetch(url)
        .then(res => res.json())
        .then(data => data.balances.find((coin: any) => coin.contract === config.coinContractAddress))
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
  }, [setUserTokenBalance, userAddress])
  const updateBalance = useCallback(async () => {
    if (userAddress) {
      const balance = await Tezos.tz.getBalance(userAddress);
      setUserBalance(balance.toNumber() / 10**6);
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
      Publish.userTokenBalance(userTokenBalance);
    }
  }, [userTokenBalance])
  useEffect(() => {
    if (userBalance !== -1) {
      Publish.userBalance(userBalance);
    }
  }, [userBalance])

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
          <div className="form-grid-vertical">
            <div className="form-row form-row-last">
              <div className="w-layout-grid grid-4">
                <ExchangeForm
                  contract={contract}
                  setUserBalance={setUserBalance}
                  Tezos={Tezos}
                  userAddress={userAddress}
                  setStorage={setStorage}
                  storage={storage}
                />

                {!userAddress &&
                  <ConnectButton
                    Tezos={Tezos}
                    setPublicToken={setPublicToken}
                    setWallet={setWallet}
                    setUserAddress={setUserAddress}
                    setUserBalance={setUserBalance}
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
                    setUserBalance={setUserBalance}
                    setWallet={setWallet}
                    setTezos={setTezos}
                    setBeaconConnection={setBeaconConnection}
                  />
                }
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
