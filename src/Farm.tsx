import React, { useEffect, useCallback, useState } from "react";
import { TezosToolkit } from "@taquito/taquito";
// import "./App.css";
import ConnectButton from "./components/ConnectWallet";
import DisconnectButton from "./components/DisconnectWallet";
import qrcode from "qrcode-generator";
import StakingForm from './components/StakingForm';
import config from './config';
import Publish from './publish';
import PriceChart from './PriceChart';
import { bytes2Char } from '@taquito/utils';

interface FarmProps {
  farmContract: string | any,
  swapContract: string | any
}

const Farm = ({ farmContract, swapContract }: FarmProps) => {
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
          farmContractAddress: farmContract,
        }
        setTokenDetails(tokenDetails)
      } catch (e) {
        console.error(e)
      }
    }

    initContract()
  }, [Tezos.wallet, farmContract])

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
    <div className="section bg-gray-1">
      <div className="container">
          <div className="farm">
          <div className="farm-title-wrapper">
            <div className="farm-titel">
              <div className="farm-titel-inlay">
                <div>
                  <div>Total Staked</div>
                  <div id="totalStaked" className="totalstaked">$5,849,400</div>
                </div>
                <div className="align-right">
                  <div>Farming APY</div>
                  <div id="farmApy" className="farmapy">321.08%</div>
                </div>
                <div data-w-id="e799ee40-c2cf-545d-1c77-b15068d00b93" data-animation-type="lottie" data-src="documents/lf30_editor_qdh1yqpy.json" data-loop="1" data-direction="1" data-autoplay="1" data-is-ix2-target="0" data-renderer="svg" data-default-duration="1.6" data-duration="1.6" className="lottie-animation-copy"></div>
              </div>
            </div>
            <div className="farm-title-coins">
              <div className="coin-top">
                <div className="farm-coin"><img src="images/1_ZdaWerzN9F7oIyhZEwcRqQ-1.jpeg" loading="lazy" id="tokenImageInput" alt="" /></div>
              </div>
              <div>
                <div className="farm-coin"><img src="images/CVCA-COIN-ico-256.png" loading="lazy" id="tokenImageOutput" alt="" /></div>
              </div>
            </div>
          </div>
          <h5>Deposit <span id="tokenNameInput" className="tokennameinput">$CVZA</span> to earn <span id="tokenNameOutput" className="tokennameoutput">$WSTD</span></h5>
          <div id="active" className="text-pill-tiny green">
            <div>Active</div>
          </div>
          <div id="ended" className="text-pill-tiny red">
            <div>Ended</div>
          </div>
          <div className="w-layout-grid farm-grid">
            <div className="label">Start date</div>
            <div id="startDate" className="farm-startdate">7 may 2021 20:00 UTC</div>
            <div className="label">End date</div>
            <div id="endDate" className="farm-enddate">2 July 2021 20:00 UTC</div>
            <div className="label">Your stake</div>
            <div id="yourStake" className="farm-yourstake">$0.00</div>
            <div className="label">$CVZA reward</div>
            <div id="cvzaReward" className="farm-cvzareward">$0.00</div>
            <div className="label">$WSTD reward</div>
            <div id="returnReward" className="farm-tokenreward">$0.00</div>
          </div>
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
      </div>
    </div>
    
  );
};

export default Farm;
