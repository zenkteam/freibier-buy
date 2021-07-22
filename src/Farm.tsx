import {
  ContractAbstraction,
  ContractMethod,
  MichelsonMap,
  TezosToolkit,
  UnitValue,
  Wallet
} from "@taquito/taquito";
import BigNumber from "bignumber.js";
import React, { useCallback, useEffect, useState } from "react";
import ConnectButton from "./components/ConnectWallet";
import DepositModal from './components/DepositModal';
import DisconnectButton from "./components/DisconnectWallet";
import WithdrawModal from './components/WithdrawModal';
import config from "./config";
import Publish from "./publish";

interface FarmProps {
  farmContract: string | any;
  swapContract: string | any;
}

interface FarmType {
  startDate: Date,
  endDate: Date,
  totalStaked?: BigNumber,
  APR?: BigNumber,
  personalStake?: BigNumber,
  personalUnclaimedReward?: BigNumber,
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
  personalStake: undefined,
  personalUnclaimedReward: undefined,
  fromSymbol: "CVZA-QP",
  fromDecimals: 6,
  toSymbol: "CVZA",
  toDecimals: 6,
};

type delegatorRecord = {
  lpTokenBalance: BigNumber;
  accumulatedRewardPerShareStart: BigNumber;
};

type address = string;
interface farmContractStorage {
  farm: {
    lastBlockUpdate: BigNumber;
    accumulatedRewardPerShare: BigNumber;
    plannedRewards: {
      rewardPerBlock: BigNumber;
      totalBlocks: BigNumber;
    };
    claimedRewards: {
      unpaid: BigNumber;
      paid: BigNumber;
    };
  };
  farmLpTokenBalance: BigNumber;
  delegators: MichelsonMap<address, delegatorRecord>;
  addresses: {
    admin: address;
    lpTokenContract: address;
    rewardTokenContract: address;
    rewardReserve: address;
  };
}


const Farm = ({ farmContract, swapContract }: FarmProps) => {
  const [Tezos, setTezos] = useState<TezosToolkit>(
    new TezosToolkit(config.rpcUrl)
  );
  const [contract, setContract] = useState<any>(undefined);
  const [farmContractInstance, setFarmContractInstance] = useState<
    ContractAbstraction<Wallet> | undefined
  >(undefined);
  const [wallet, setWallet] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [userBalance, setUserBalance] = useState<number>(-1);
  const [userTokenBalance, setUserTokenBalance] = useState<number>(-1);
  const [storage, setStorage] = useState<any>();
  const [tokenDetails, setTokenDetails] = useState<any>();
  const [farm, setFarm] = useState<FarmType>(initialFarm);
  const [farmStorage, setFarmStorage] = useState<farmContractStorage>();
  const [depositValue, setDepositValue] = useState<string>("0.00");
  const [unstakeValue, setUnstakeValue] = useState<string>("0.00");
  const [hasLpToken, setHasLpToken] = useState<boolean>(false);
  const [depoiting, setDepoiting] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [exiting, setExiting] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);

  // creates contract instance
  useEffect(() => {
    // DEX LP token contract
    async function initContract() {
      const newContract = await Tezos.wallet.at(swapContract);
      const newStorage: any = await newContract.storage();

      setContract(newContract);
      setStorage(newStorage);
    }

    async function initFarmContract() {
      const farmContractInstance = await Tezos.wallet.at(farmContract);
      const newFarmStorage =
        await farmContractInstance.storage<farmContractStorage>();
      setFarmContractInstance(farmContractInstance);
      setFarmStorage(newFarmStorage);
    }

    async function init() {
      await initContract();
      await initFarmContract();
    }
    init();
  }, [Tezos.wallet, farmContract, userAddress]);

  useEffect(() => {
    if (userTokenBalance > 0) {
      setHasLpToken(true);
    }
  }, [userTokenBalance]);

  useEffect(() => {
    async function initUser() {
      if (farmStorage) {
        const update = {
          personalStake: await getPersonalStake(farmStorage),
          personalUnclaimedReward: await delegatorReward(),
        }
        // update the current version of farm
        setFarm((farm) => Object.assign({}, farm, update));
      }
    }
    initUser();
  }, [farmStorage]);

  useEffect(() => {
    async function initFarmStats() {
      if (farmStorage) {
        const update = {
          totalStaked: await getTotalStaked(),
          APR: await estimateAPR(farmStorage),
        }
        // update the current version of farm
        setFarm((farm) => Object.assign({}, farm, update));
      }
    }
    initFarmStats();
  }, [farmStorage]);

  // update balances
  const updateTokenBalance = useCallback(() => {
    if (userAddress && tokenDetails) {
      const url = `https://api.better-call.dev/v1/account/${config.network}/${userAddress}/token_balances`;
      fetch(url)
        .then((res) => res.json())
        .then((data) =>
          data.balances.find(
            (coin: any) => coin.contract === tokenDetails.coinContractAddress
          )
        )
        .then((coin) => {
          if (coin) {
            setUserTokenBalance(parseInt(coin.balance) / 10 ** coin.decimals);
          } else {
            setUserTokenBalance(0);
          }
        });
    } else {
      setUserTokenBalance(-1);
    }
  }, [setUserTokenBalance, userAddress, tokenDetails]);
  const updateBalance = useCallback(async () => {
    if (userAddress) {
      try {
        const balance = await Tezos.tz.getBalance(userAddress);
        setUserBalance(balance.toNumber() / 10 ** 6);
      } catch (e) {
        console.warn(e);
      }
    } else {
      setUserBalance(-1);
    }
  }, [setUserBalance, userAddress, Tezos.tz]);
  useEffect(() => {
    updateBalance();
    updateTokenBalance();
  }, [userAddress, updateTokenBalance, updateBalance]);
  useEffect(() => {
    if (userTokenBalance !== -1) {
      Publish.userTokenBalance(userTokenBalance, tokenDetails?.symbol);
    }
  }, [userTokenBalance, tokenDetails]);
  useEffect(() => {
    if (userBalance !== -1) {
      Publish.userBalance(userBalance);
    }
  }, [userBalance]);
  useEffect(() => {
    const interval = setInterval(() => {
      updateBalance();
      updateTokenBalance();
    }, 10000);
    return () => clearInterval(interval);
  }, [updateBalance, updateTokenBalance]);



  /////////
  /// Helpers
  ///////// 

  /**
   * This function checks whether the user has already given an allowance to the farm.
   *
   * Token holders can give other addresses (and therefore smart contacts)
   * an "allowance" to spend tokens on their behalf.
   * For FA1.2 the entrypoint is called %approve or %approveCAS,
   * in FA2 it is %update_operators.
   */
  async function hasOperator(): Promise<boolean> {
    /**
     * this line needs to be changed depending on the storage structure of the contract
     * Quipuswap will have a different FA2 storage implementation
     */
    const allowances = await storage.tzip12.tokenOperators.get(userAddress);
    if (!allowances) {
      return false;
    }

    return farmContactIsOperator(allowances);
  }

  function farmContactIsOperator(allowances: [string]): boolean {
    return allowances.includes(farmContractInstance!.address);
  }

  function tokenFA2AddOperator() {
    const operationPromise: Promise<ContractMethod<Wallet>> =
      contract.methods.update_operators([
        {
          add_operator: {
            owner: userAddress,
            operator: farmContractInstance!.address,
          },
        },
      ]);

    return operationPromise;
  }



  /////////
  /// GETTERS
  /////////  

  // TODO: check if calculation is right
  /**
   * Formula
   * APR = Total LP staked expressed as reward token / yearly reward in reward token
   *     = yearly reward / dexStorage.token_pool * LP
   *     = (reward per block * blocks per year) / dexStorage.token_pool * LP
   */
  async function estimateAPR(farmStorage: farmContractStorage) {
    //FOR TESTING PLEASE REMOVE
    const tezos2 = new TezosToolkit("https://mainnet-tezos.giganode.io");
    const swapContractInstance = await tezos2.contract.at(
      "KT1F3BqwEAoa2koYX4Hz7zJ8xfGSxxAGVT8t"
    );
    const swapContractStorage = await swapContractInstance.storage<any>();
    const dexTokenPool = swapContractStorage.storage.token_pool as BigNumber;
    const blocksPerYear = 365 * 24 * 60;
    const APR = farmStorage.farm.plannedRewards.rewardPerBlock
      .multipliedBy(blocksPerYear)
      .dividedBy(dexTokenPool.multipliedBy(await getTotalStaked()))
      //.dividedBy(100) // because of decimal difference of 100 between CVZA and XTZ
      .multipliedBy(100); // to get percentage

    return APR;
  }

  async function updateAccumulatedRewardPerShare(
    farmStorage: farmContractStorage
  ) {
    const lastBlockUpdate = farmStorage.farm.lastBlockUpdate;
    const { level: currentLevel } = await Tezos.rpc.getBlockHeader();
    const multiplier = new BigNumber(currentLevel).minus(lastBlockUpdate);

    const outstandingReward = multiplier.multipliedBy(
      farmStorage.farm.plannedRewards.rewardPerBlock
    );

    const claimedRewards = farmStorage.farm.claimedRewards.paid.plus(
      farmStorage.farm.claimedRewards.unpaid
    );
    const totalRewards = outstandingReward.plus(claimedRewards);
    const plannedRewards =
      farmStorage.farm.plannedRewards.rewardPerBlock.multipliedBy(
        farmStorage.farm.plannedRewards.totalBlocks
      );
    const totalRewardsExhausted = totalRewards.isGreaterThan(plannedRewards);

    const reward = totalRewardsExhausted
      ? plannedRewards.minus(claimedRewards)
      : outstandingReward;

    return farmStorage.farm.accumulatedRewardPerShare.plus(
      reward.multipliedBy(1000000).div(farmStorage.farmLpTokenBalance)
    );
  }

  // TODO: check if calculation is right
  async function delegatorReward() {
    const newContract = await Tezos.wallet.at(farmContract);
    const newStorage = await newContract.storage<farmContractStorage>();
    const delegatorAddress = await Tezos.wallet.pkh();
    const delegatorRecord = await newStorage.delegators.get(delegatorAddress);
    if (!delegatorRecord) {
      return new BigNumber(0);
    }

    const accRewardPerShareStart = delegatorRecord.accumulatedRewardPerShareStart;
    const accRewardPerShareEnd = await updateAccumulatedRewardPerShare(
      farmStorage!
    );
    const accRewardPerShare = accRewardPerShareEnd.minus(
      accRewardPerShareStart
    );
    const delegatorReward = accRewardPerShare.multipliedBy(
      delegatorRecord.lpTokenBalance
    );

    return delegatorReward.dividedBy(10 ** farm.fromDecimals);
  }

  async function getTotalStaked() {
    const tezos = new TezosToolkit(config.rpcUrl);
    const farmContractInstance = await tezos.contract.at(farmContract);
    const farmContractStorage = await farmContractInstance.storage<farmContractStorage>();
    return farmContractStorage.farmLpTokenBalance;
  }

  async function getPersonalStake(
    farmStorage: farmContractStorage
  ): Promise<BigNumber> {
    const delegatorAddress = await Tezos.wallet.pkh();
    const delegatorRecord = await farmStorage.delegators.get(delegatorAddress);

    if (!delegatorRecord) {
      return new BigNumber(0);
    }
    return delegatorRecord.lpTokenBalance
  }


  //////////
  /// CONTRACT INTERACTIONS
  //////////

  async function performDeposit(amount: BigNumber) {
    // check whether there is already an allowance
    const contractIsOperator = await hasOperator();
    const depositOperation = farmContractInstance!.methods.deposit(amount);

    if (!contractIsOperator) {
      // Approve and then deposit
      const addOperatorTransactionPromise = tokenFA2AddOperator();
      const tx = await Tezos.wallet
        .batch()
        .withContractCall(await addOperatorTransactionPromise)
        .withContractCall(depositOperation)
        .send();
      await tx.confirmation(1)
      return tx
    } else {
      // Only deposit

      // TODO: ???
      //   const depositStorageLimit = await estimateDepositStorageLimit(1)
      //   const storageLimit = depositStorageLimit * storageLimitSurcharge;
      //   const sendParameters = {
      //     amount: 0,
      //     storageLimit: storageLimit
      //   };

      const tx = await depositOperation.send();
      await tx.confirmation(1)
      return tx
    }
  }

  async function performWithdraw(amount: BigNumber) {
    const tx = await farmContractInstance!.methods.withdraw(amount).send();
    await tx.confirmation(1)
    return tx
  }

  async function performClaim() {
    const tx = await farmContractInstance!.methods.claim(UnitValue).send();
    await tx.confirmation(1)
    return tx
  }

  async function deposit() {
    const amount = new BigNumber(depositValue).shiftedBy(farm.fromDecimals).decimalPlaces(0, BigNumber.ROUND_DOWN);
    if (amount.isZero()) return

    setDepoiting(true)
    try {
      await performDeposit(amount)

      // update UI
      setShowDepositModal(false)
      setDepositValue('0.00')
      setFarm((farm) => {
        farm.totalStaked = farm.totalStaked?.plus(amount)
        farm.personalStake = farm.personalStake?.plus(amount)
        return farm
      })
      // TODO: refresh balances
    } catch (e) {
      console.error(e)
    }
    setDepoiting(false)
  }

  async function claim() {
    // TODO: ???
    // increasing storageLimit programmatically is optional
    // const claimStorageLimit = await estimateClaimStorage();
    // const storageLimit = claimStorageLimit * config.storageLimitSurcharge;
    // const transferParameters = {
    //   storageLimit: storageLimit,
    // };
    // remove transferParameters for default storageLimit estimate

    setClaiming(true)
    try {
      await performClaim()

      // update UI
      setFarm((farm) => {
        farm.personalUnclaimedReward = new BigNumber(0)
        return farm
      })
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
      await performWithdraw(amount)

      // update UI
      setShowWithdrawModal(false)
      setUnstakeValue('0.00')
      setFarm((farm) => {
        farm.totalStaked = farm.totalStaked?.minus(amount)
        farm.personalUnclaimedReward = new BigNumber(0)
        farm.personalStake = farm.personalStake?.minus(amount)
        return farm
      })
      // TODO: refresh balances
    } catch (e) {
      console.error(e)
    }
    setWithdrawing(false)
  }

  async function exit() {
    // TODO: ???
    // const claimAndUnstakeStorageLimit =
    //   await estimateStorageLimitClaimAndUnstake(amount);
    // const storageLimit =
    //   claimAndUnstakeStorageLimit * config.storageLimitSurcharge;
    // const transferParameters = {
    //   storageLimit: storageLimit,
    // };

    const amount = farm.personalStake
    if (!amount) return

    setExiting(true)
    try {
      await performWithdraw(amount)

      // update UI
      setFarm((farm) => {
        farm.totalStaked = farm.totalStaked?.minus(amount)
        farm.personalUnclaimedReward = new BigNumber(0)
        farm.personalStake = new BigNumber(0)
        return farm
      })
      // TODO: refresh balances
    } catch (e) {
      console.error(e)
    }
    setExiting(false)
  }


  /// OTHER

  // async function estimateTokenFA2AddOperator() {
  //   const addOperatorTransferParameters = contract.methods
  //     .update_operators([
  //       {
  //         add_operator: {
  //           owner: userAddress,
  //           operator: farmContractInstance!.address,
  //         },
  //       },
  //     ])
  //     .toTransferParams();
  //   const addOperatorEstimate = await Tezos.estimate.transfer(
  //     addOperatorTransferParameters
  //   );
  //   const addOperatorStorageLimit = addOperatorEstimate.storageLimit;

  //   return addOperatorStorageLimit;
  // }

  // async function estimateDepositStorageLimit(amount: BigNumber) {
  //   const depositTransferParameters = farmContractInstance!.methods
  //     .deposit(amount)
  //     .toTransferParams({});
  //   const depositEstimate = await Tezos.estimate.transfer(
  //     depositTransferParameters
  //   );
  //   const depositEstimateStorageLimit = depositEstimate.storageLimit;

  //   return depositEstimateStorageLimit;
  // }

  // async function estimateStorageLimitClaimAndUnstake(amount: BigNumber) {
  //   const withdrawOperationTransferParameters = farmContractInstance!.methods
  //     .withdraw(amount)
  //     .toTransferParams();
  //   const withdrawEstimate = await Tezos.estimate.transfer(
  //     withdrawOperationTransferParameters
  //   );
  //   const withdrawStorageLimit = withdrawEstimate.storageLimit;
  //   return withdrawStorageLimit;
  // }


  // async function estimateClaimStorage() {
  //   const claimOperationTransferParameters = farmContractInstance!.methods
  //     .claim(UnitValue)
  //     .toTransferParams();
  //   console.log(Tezos);
  //   const claimEstimate = await Tezos.estimate.transfer(
  //     claimOperationTransferParameters
  //   );
  //   const claimStorageLimit = claimEstimate.storageLimit;
  //   return claimStorageLimit;
  // }


  return (
    <div className="section bg-gray-1">
      {/* Disconnect */}
      {userAddress && (
        <DisconnectButton
          wallet={wallet}
          setUserAddress={setUserAddress}
          setWallet={setWallet}
          setTezos={setTezos}
        />
      )}

      <div className="container">
        <div className="wrapper" style={{ position: 'relative' }}>
          <div className="farm">
            <div className="farm-title-wrapper">
              <div className="farm-titel">
                <div className="farm-titel-inlay">
                  <div style={{textAlign: 'left'}}>
                    <div>Total Staked</div>
                    <div id="totalStaked" className="totalstaked">
                      {farm.totalStaked?.shiftedBy(-farm.fromDecimals).toFixed(2)}&nbsp;${farm.fromSymbol}
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
                    data-src="documents/lf30_editor_qdh1yqpy.json"
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
                      src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/6092c5a84ac959603b28b19c_1_ZdaWerzN9F7oIyhZEwcRqQ%20(1).jpeg"
                      loading="lazy"
                      id="tokenImageInput"
                      alt=""
                    />
                  </div>
                </div>
                <div>
                  <div className="farm-coin">
                    <img
                      src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/60911d04b9836a75b1dfa271_CVCA-COIN-ico-256.png"
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
            ) : (
              <div id="active" className="text-pill-tiny green">
                <div>Active</div>
              </div>
            )}

            <div className="w-layout-grid farm-grid">
              <div className="label">Start date</div>
              <div id="startDate" className="farm-startdate">
                {farm.startDate.toUTCString()}
              </div>
              <div className="label">End date</div>
              <div id="endDate" className="farm-enddate">
                {farm.endDate.toUTCString()}
              </div>
              <div className="label">Your stake (${farm.fromSymbol})</div>
              <div id="yourStake" className="farm-yourstake">
                {farm.personalStake?.shiftedBy(-farm.fromDecimals).toFixed(2)}
              </div>
              <div className="label">Unclaimed reward (${farm.toSymbol})</div>
              <div id="cvzaReward" className="farm-cvzareward">
                {farm.personalUnclaimedReward?.shiftedBy(-farm.toDecimals).toFixed(2)}
              </div>
            </div>

            {!userAddress && (
              <div className="w-layout-grid">
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
                    <span className="tokennameinput">${farm.fromSymbol}</span>
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
                <button
                  id="exit"
                  onClick={() => exit()}
                  disabled={exiting || farm.personalStake?.isZero()}
                  className={
                    'farm-buttons w-node-_58d63a0e-4a37-39e2-c3d7-2d81eefd4bbe-8f74eee8 w-inline-block '
                    + (farm.personalStake && !farm.personalStake.isZero() && !exiting ? 'active' : '')
                  }
                >
                  <div className="button-label-main">
                    {exiting ? 'Exiting...' : 'Exit'}
                  </div>
                  <div className="tiny-text _50">
                    Withdraw and claim
                  </div>
                </button>
              </div>
            )}
          </div>

          {showDepositModal &&
            <DepositModal
              hideDepositModal={() => setShowDepositModal(false)}
              depositValue={depositValue}
              setDepositValue={setDepositValue}
              personalStake={(farm.personalStake || new BigNumber(0)).shiftedBy(-farm.fromDecimals)}
              deposit={deposit}
              depositing={depoiting}
              symbol={farm.fromSymbol}
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
            ></WithdrawModal>
          }
        </div>
      </div>
    </div>
  );
};

export default Farm;
