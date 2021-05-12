import React, { useEffect, useState } from "react";
import { TezosToolkit } from "@taquito/taquito";
import "./App.css";
import ConnectButton from "./components/ConnectWallet";
import DisconnectButton from "./components/DisconnectWallet";
import qrcode from "qrcode-generator";
import ExchangeForm from './components/ExchangeForm';

enum BeaconConnection {
  NONE = "",
  LISTENING = "Listening to P2P channel",
  CONNECTED = "Channel connected",
  PERMISSION_REQUEST_SENT = "Permission request sent, waiting for response",
  PERMISSION_REQUEST_SUCCESS = "Wallet is connected"
}

const App = () => {
  const [Tezos, setTezos] = useState<TezosToolkit>(
    new TezosToolkit("https://rpc.tzbeta.net")
  );
  const [contract, setContract] = useState<any>(undefined);
  const [publicToken, setPublicToken] = useState<string | null>("");
  const [wallet, setWallet] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [userBalance, setUserBalance] = useState<number>(0);
  const [storage, setStorage] = useState<any>();
  const [copiedPublicToken, setCopiedPublicToken] = useState<boolean>(false);
  const [beaconConnection, setBeaconConnection] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("contract");

  const contractAddress: string = "KT1F3BqwEAoa2koYX4Hz7zJ8xfGSxxAGVT8t";

  // creates contract instance
  async function initContract() {
    const newContract = await Tezos.wallet.at(contractAddress);
    const newStorage: any = await newContract.storage();
    setContract(newContract);
    setStorage(newStorage);
  }
  useEffect(() => {
    initContract()
  }, [])


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
            
            <ExchangeForm
              contract={contract}
              setUserBalance={setUserBalance}
              Tezos={Tezos}
              userAddress={userAddress}
              setStorage={setStorage}
              storage={storage}
            />

            { !publicToken && !userAddress && !userBalance &&     
              <div className="w-layout-grid grid-4">
                <ConnectButton
                  Tezos={Tezos}
                  setPublicToken={setPublicToken}
                  setWallet={setWallet}
                  setUserAddress={setUserAddress}
                  setUserBalance={setUserBalance}
                  setBeaconConnection={setBeaconConnection}
                  wallet={wallet}
                />
              </div>
            }

            { /* Connecting */ }
            { publicToken && (!userAddress || isNaN(userBalance)) &&
              <div id="content">
                <p className="text-align-center">
                  <i className="fas fa-broadcast-tower"></i>&nbsp; Connecting to
                  your wallet
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
            
            { /* Disconnect */ }
            { userAddress &&
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
    );
};

export default App;
