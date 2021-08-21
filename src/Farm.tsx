import { ContractAbstraction, TezosToolkit, Wallet } from "@taquito/taquito";
import BigNumber from "bignumber.js";
import React, { useEffect, useState } from "react";
import ConnectButton from "./components/ConnectWallet";
import DepositModal from './components/DepositModal';
import DisconnectButton from "./components/DisconnectWallet";
import WithdrawModal from './components/WithdrawModal';
import config from "./config";
import { delegatorRecord, delegatorReward, estimateAPR, FarmStorageInterface, getPersonalMaxDeposit, getPersonalStake, getTotalStaked, performClaim, performDeposit, performWithdraw } from './services/farmContract';

interface FarmProps {
  farmContractAddress: string;
  swapContractAddress: string;
  startDate: string;
  endDate: string;
}

interface FarmType {
  startDate: Date,
  endDate: Date,
  totalStaked?: BigNumber,
  APR?: BigNumber,
  personalMaxDeposit?: BigNumber,
  personalStake?: BigNumber,
  personalUnclaimedReward?: BigNumber,
  personalLastUpdate?: Date,
  fromSymbol: string,
  fromDecimals: number,
  toSymbol: string,
  toDecimals: number,
}

let initialFarm: FarmType = {
  startDate: new Date('01 Jul 2021 20:00:00 UTC'),
  endDate: new Date('01 Sep 2021 20:00:00 UTC'),
  totalStaked: undefined,
  APR: undefined,
  personalMaxDeposit: undefined,
  personalStake: undefined,
  personalUnclaimedReward: undefined,
  personalLastUpdate: undefined,
  fromSymbol: "CVZA-QP",
  fromDecimals: 6,
  toSymbol: "CVZA",
  toDecimals: 8,
};

const REFRESH_INTERVAL = 30000


const Farm = ({ farmContractAddress, swapContractAddress, startDate, endDate }: FarmProps) => {
  // Wallet
  const [Tezos, setTezos] = useState<TezosToolkit>(new TezosToolkit(config.rpcUrl));
  const [wallet, setWallet] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  // const [userTokenBalances, setUserTokenBalances] = useState<Array<any>>([]);

  // Contracts
  const [swapContractInstance, setSwapContractInstance] = useState<ContractAbstraction<Wallet>>();
  const [farmContractInstance, setFarmContractInstance] = useState<ContractAbstraction<Wallet>>();
  const [swapStorage, setSwapStorage] = useState<any>();
  const [farmStorage, setFarmStorage] = useState<FarmStorageInterface>();
  const [farm, setFarm] = useState<FarmType>(initialFarm);

  // UI Interactions
  const [depositValue, setDepositValue] = useState<string>("0.00");
  const [unstakeValue, setUnstakeValue] = useState<string>("0.00");
  const [depoiting, setDepoiting] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [exiting, setExiting] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);

  /////////
  /// Wallet Balances
  ///////// 

  // update token balances
  // const updateTokenBalance = useCallback(() => {
  //   if (userAddress) {
  //     const url = `https://api.better-call.dev/v1/account/${config.network}/${userAddress}/token_balances`;
  //     fetch(url)
  //       .then((res) => res.json())
  //       .then((res) => {
  //         if (res && res.balances) {
  //           setUserTokenBalances(res.balances);
  //         }
  //       })
  //       .catch(console.error)
  //   } else {
  //     setUserTokenBalances([]);
  //   }
  // }, [setUserTokenBalances, userAddress]);

  // trigger update when user changes
  // useEffect(() => {
  //   updateTokenBalance();
  // }, [userAddress, updateTokenBalance]);

  // periodically update balances
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     updateTokenBalance();
  //   }, REFRESH_INTERVAL);
  //   return () => clearInterval(interval);
  // }, [updateTokenBalance]);

  /////////
  /// Contracts
  ///////// 

  const initSwapContract = async (tezos: TezosToolkit, address: string) => {
    const contractInstance = await tezos.wallet.at(address);
    setSwapContractInstance(contractInstance);
  }

  const initFarmContract = async (tezos: TezosToolkit, address: string) => {
    const contractInstance = await tezos.wallet.at(address);
    setFarmContractInstance(contractInstance);
  }

  const updateSwapStorage = async (contractInstance: ContractAbstraction<Wallet>) => {
    const newSwapStorage = await contractInstance.storage<any>();
    setSwapStorage(newSwapStorage);
  }

  const updateFarmStorage = async (contractInstance: ContractAbstraction<Wallet>) => {
    const newFarmStorage = await contractInstance.storage<FarmStorageInterface>();
    setFarmStorage(newFarmStorage);
  }

  const updateFarmState = async (tezos: TezosToolkit, storage: FarmStorageInterface, swapStorage: any, user: string) => {
    const delegator = user ? await delegatorRecord(tezos, storage) : undefined
    const update = {
      personalMaxDeposit: user ? await getPersonalMaxDeposit(swapStorage, user) : new BigNumber(0),
      personalStake: delegator ? await getPersonalStake(delegator) : new BigNumber(0),
      personalUnclaimedReward: delegator ? await delegatorReward(tezos, storage, delegator) : new BigNumber(0),
      personalLastUpdate: delegator?.lastUpdate,
      totalStaked: await getTotalStaked(storage),
      APR: await estimateAPR(storage, swapStorage),
    }
    // update the current version of farm
    setFarm((farm) => Object.assign({}, farm, update));
  }

  // creates contract instances
  useEffect(() => {
    initSwapContract(Tezos, swapContractAddress);
  }, [Tezos, swapContractAddress]);

  useEffect(() => {
    initFarmContract(Tezos, farmContractAddress);
  }, [Tezos, farmContractAddress]);

  useEffect(() => {
    if (swapContractInstance) {
      updateSwapStorage(swapContractInstance)
    }
  }, [swapContractInstance])

  useEffect(() => {
    if (farmContractInstance) {
      updateFarmStorage(farmContractInstance)
    }
  }, [farmContractInstance])

  // periodically update balances
  useEffect(() => {
    const interval = setInterval(() => {
      if (farmContractInstance) {
        updateFarmStorage(farmContractInstance)
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [farmContractInstance]);

  useEffect(() => {
    if (Tezos && farmStorage && swapStorage) {
      updateFarmState(Tezos, farmStorage, swapStorage, userAddress)
    }
  }, [Tezos, farmStorage, swapStorage, userAddress])

  useEffect(() => {
    const update = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    }
    setFarm((farm) => Object.assign({}, farm, update));
  }, [startDate, endDate])

  //////////
  /// CONTRACT INTERACTIONS
  //////////

  async function deposit() {
    const amount = new BigNumber(depositValue).shiftedBy(farm.fromDecimals).decimalPlaces(0, BigNumber.ROUND_DOWN);
    if (amount.isZero()) return

    setDepoiting(true)
    try {
      await performDeposit(Tezos, swapContractInstance!, farmContractInstance!, swapStorage, amount)

      // update UI
      setShowDepositModal(false)
      setDepositValue('0.00')
      await updateFarmStorage(farmContractInstance!)
    } catch (e) {
      console.error(e)
    }
    setDepoiting(false)
  }

  async function claim() {
    setClaiming(true)
    try {
      await performClaim(farmContractInstance!)

      // update UI
      await updateFarmStorage(farmContractInstance!)
    } catch (e) {
      console.error(e)
    }
    setClaiming(false)
  }

  async function withdraw() {
    const amount = new BigNumber(unstakeValue).shiftedBy(farm.fromDecimals).decimalPlaces(0, BigNumber.ROUND_DOWN);
    if (amount.isZero()) return

    setWithdrawing(true)
    try {
      await performWithdraw(farmContractInstance!, amount)

      // update UI
      setShowWithdrawModal(false)
      setUnstakeValue('0.00')
      await updateFarmStorage(farmContractInstance!)
    } catch (e) {
      console.error(e)
    }
    setWithdrawing(false)
  }

  async function exit() {
    const amount = farm.personalStake
    if (!amount) return

    setExiting(true)
    try {
      await performWithdraw(farmContractInstance!, amount)

      // update UI
      await updateFarmStorage(farmContractInstance!)
    } catch (e) {
      console.error(e)
    }
    setExiting(false)
  }

  return (
    <div className="section bg-gray-1">
      <div className="container">
        <div className="wrapper">
          <div className="farm">
            <div className="farm-title-wrapper">
              <div className="farm-titel">
                <div className="farm-titel-inlay">
                  <div style={{ textAlign: 'left' }}>
                    <div>Total Staked</div>
                    <div id="totalStaked" className="totalstaked">
                      {farm.totalStaked?.shiftedBy(-farm.fromDecimals).toNumber().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: farm.fromDecimals })}&nbsp;${farm.fromSymbol}
                    </div>
                  </div>
                  <div className="align-right">
                    <div>Farming APR</div>
                    <div id="farmApy" className="farmapy">
                      {farm.APR?.toFixed(2)}%
                    </div>
                  </div>
                  <div
                    data-w-id="e799ee40-c2cf-545d-1c77-b15068d00b93"
                    data-animation-type="lottie"
                    data-src="https://uploads-ssl.webflow.com/611628d3fab35c8d64c4b6e6/611628d3fab35c01c8c4b8e1_lf30_editor_qdh1yqpy.json"
                    data-loop="1"
                    data-direction="1"
                    data-autoplay="1"
                    data-is-ix2-target="0"
                    data-renderer="svg"
                    data-default-duration="1.6"
                    data-duration="1.6"
                    className="lottie-animation-copy"
                  ></div>
                </div>
              </div>
              <div className="farm-title-coins">
                <div className="coin-top">
                  <div className="farm-coin">
                    <img
                      src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/60911d04b9836a75b1dfa271_CVCA-COIN-ico-256.png"
                      loading="lazy"
                      id="tokenImageInput"
                      alt=""
                    />
                  </div>
                </div>
                <div>
                  <div className="farm-coin">
                    <img
                      src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/6092c5a84ac959603b28b19c_1_ZdaWerzN9F7oIyhZEwcRqQ%20(1).jpeg"
                      loading="lazy"
                      id="tokenImageOutput"
                      alt=""
                    />
                  </div>
                </div>
              </div>
            </div>
            <h5>
              Deposit
              &nbsp;
              <span id="tokenNameInput" className="tokennameinput">
                ${farm.fromSymbol}
              </span>
              &nbsp;
              to earn
              &nbsp;
              <span id="tokenNameOutput" className="tokennameoutput">
                ${farm.toSymbol}
              </span>
            </h5>

            {Date.now() > farm.endDate.getTime() ? (
              <div id="ended" className="text-pill-tiny red">
                <div>Ended</div>
              </div>
            ) : (Date.now() > farm.startDate.getTime() ? (
              <div id="active" className="text-pill-tiny green">
                <div>Active</div>
              </div>
            ) : (
              <div id="active" className="text-pill-tiny blue">
                <div>In Preperation</div>
              </div>
            ))}

            <div className="w-layout-grid farm-grid">
              <div className="label">Start date</div>
              <div id="startDate" className="farm-startdate">
                {farm.startDate.toDateString()}
              </div>
              <div className="label">End date</div>
              <div id="endDate" className="farm-enddate">
                {farm.endDate.toDateString()}
              </div>
              <div className="label">Your stake <span style={{whiteSpace: 'nowrap'}}>(${farm.fromSymbol})</span></div>
              <div id="yourStake" className="farm-yourstake">
                {farm.personalStake?.shiftedBy(-farm.fromDecimals).toNumber().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: farm.fromDecimals })}
              </div>
              <div className="label">Unclaimed reward (${farm.toSymbol})</div>
              <div id="cvzaReward" className="farm-cvzareward">
                {farm.personalUnclaimedReward?.shiftedBy(-farm.toDecimals).toNumber().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: farm.toDecimals })}
              </div>
            </div>

            {!userAddress && (
              <div className="">
                <ConnectButton
                  Tezos={Tezos}
                  setWallet={setWallet}
                  setUserAddress={setUserAddress}
                  wallet={wallet}
                  showNano={false}
                />
              </div>
            )}

            {userAddress && (
              <div className="w-layout-grid">
                {/* Deposit */}
                <button
                  id="deposit"
                  onClick={() => setShowDepositModal(true)}
                  disabled={depoiting}
                  className={
                    'farm-buttons w-node-_58d63a0e-4a37-39e2-c3d7-2d81eefd4bbe-8f74eee8 w-inline-block'
                    + (!depoiting ? ' active' : '')
                  }
                >
                  <div className="button-label-main">
                    {depoiting ? 'Depositing...' : 'Deposit'}
                  </div>
                  <div className="tiny-text _50">
                    Deposit
                    {!farm.personalUnclaimedReward?.isZero() &&
                      <> and claim</>
                    }
                  </div>
                </button>

                {/* Claim */}
                <button
                  id="claim"
                  onClick={() => claim()}
                  disabled={claiming || farm.personalUnclaimedReward?.isZero()}
                  className={
                    'farm-buttons w-node-_58d63a0e-4a37-39e2-c3d7-2d81eefd4bbe-8f74eee8 w-inline-block'
                    + (farm.personalUnclaimedReward && !farm.personalUnclaimedReward.isZero() && !claiming ? ' active' : '')
                  }
                >
                  <div className="button-label-main">
                    {claiming ? 'Claiming...' : 'Claim'}
                  </div>
                  <div className="tiny-text _50">
                    <span className="tokennameoutput">${farm.toSymbol}</span> reward
                  </div>
                </button>

                {/* Withdraw */}
                <button
                  id="withdraw"
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={withdrawing || farm.personalStake?.isZero()}
                  className={
                    'farm-buttons w-node-_58d63a0e-4a37-39e2-c3d7-2d81eefd4bbe-8f74eee8 w-inline-block '
                    + (farm.personalStake && !farm.personalStake.isZero() && !withdrawing ? 'active' : '')
                  }
                >
                  <div className="button-label-main">
                    {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </div>
                  <div className="tiny-text _50">
                    <span className="tokennameinput">${farm.fromSymbol}</span>
                  </div>
                </button>

                {/* Exit */}
                { false && (
                <button
                  id="exit"
                  onClick={() => exit()}
                  disabled={exiting || farm.personalStake?.isZero()}
                  className={
                    'farm-buttons w-node-_58d63a0e-4a37-39e2-c3d7-2d81eefd4bbe-8f74eee8 w-inline-block '
                    + (farm.personalStake && !farm.personalStake!.isZero() && !exiting ? 'active' : '')
                  }
                >
                  <div className="button-label-main">
                    {exiting ? 'Exiting...' : 'Exit'}
                  </div>
                  <div className="tiny-text _50">
                    Withdraw and claim
                  </div>
                </button>
                )}

                {/* Disconnect */}
                <DisconnectButton
                  wallet={wallet}
                  setUserAddress={setUserAddress}
                  setWallet={setWallet}
                  setTezos={setTezos}
                />
              </div>
            )}
          </div>

          {showDepositModal &&
            <DepositModal
              hideDepositModal={() => setShowDepositModal(false)}
              depositValue={depositValue}
              setDepositValue={setDepositValue}
              personalMaxDeposit={(farm.personalMaxDeposit || new BigNumber(0)).shiftedBy(-farm.fromDecimals)}
              personalStake={(farm.personalStake || new BigNumber(0)).shiftedBy(-farm.fromDecimals)}
              deposit={deposit}
              depositing={depoiting}
              symbol={farm.fromSymbol}
              penalty={farmStorage?.farm.penalty}
              personalLastUpdate={farm.personalLastUpdate}
            ></DepositModal>
          }

          {showWithdrawModal &&
            <WithdrawModal
              hideWithdrawModal={() => setShowWithdrawModal(false)}
              withdrawValue={unstakeValue}
              setWithdrawValue={setUnstakeValue}
              personalStake={(farm.personalStake || new BigNumber(0)).shiftedBy(-farm.fromDecimals)}
              withdraw={withdraw}
              withdrawing={withdrawing}
              symbol={farm.fromSymbol}
              penalty={farmStorage?.farm.penalty}
              personalLastUpdate={farm.personalLastUpdate}
            ></WithdrawModal>
          }
        </div>
      </div>
    </div>
  );
};

export default Farm;
