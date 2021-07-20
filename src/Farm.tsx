import React, { useEffect, useCallback, useState } from "react";
import {
  ContractAbstraction,
  ContractMethod,
  MichelsonMap,
  TezosToolkit,
  UnitValue,
  Wallet,
} from "@taquito/taquito";
// import "./App.css";
import ConnectButton from "./components/ConnectWallet";
import DisconnectButton from "./components/DisconnectWallet";
import qrcode from "qrcode-generator";
import StakingForm from "./components/StakingForm";
import config from "./config";
import Publish from "./publish";
import { bytes2Char } from "@taquito/utils";
import BigNumber from "bignumber.js";

interface FarmProps {
  farmContract: string | any;
  swapContract: string | any;
}

const Farm = ({ farmContract, swapContract }: FarmProps) => {
  const [Tezos, setTezos] = useState<TezosToolkit>(
    new TezosToolkit(config.rpcUrl)
  );
  const [contract, setContract] = useState<any>(undefined);
  const [farmContractInstance, setFarmContractInstance] = useState<
    ContractAbstraction<Wallet> | undefined
  >(undefined);
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
  const [farm, setFarm] = useState<any>({});
  const [farmStorage, setFarmStorage] = useState<farmContractStorage>();
  const [depositValue, setDepositValue] = useState<string>("0");
  const [unstakeValue, setUnstakeValue] = useState<string>("0");
  const [hasLpToken, setHasLpToken] = useState<boolean>(false);

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

    let farm = {
      startDate: "July 1st 2021",
      endDate: "September 1st 2021",
      totalStaked: "0",
      APR: "0",
      personalStake: "0",
      personalUnclaimedReward: "0",
    };

    async function init() {
      await initContract();
      await initFarmContract();
      await setFarm(farm);
    }
    init();
  }, [Tezos.wallet, farmContract, userAddress]);

  useEffect(() => {
    if (userTokenBalance > 0) {
      setHasLpToken(true);
    }
  }, [userTokenBalance]);

  useEffect(() => {
    let updatedFarm = farm;
    async function setPersonalStake() {
      const personalStake = await getPersonalStake(farmStorage!);
      updatedFarm.personalStake = personalStake;
    }
    async function setPersonalUnclaimedReward() {
      const personalUnclaimedReward = await delegatorReward();
      updatedFarm.personalUnclaimedReward = personalUnclaimedReward;
    }
    async function initUser() {
      if (farmStorage) {
        await setPersonalStake();
        await setPersonalUnclaimedReward();
        //await setFarm(updatedFarm);
      }
    }
    initUser();
  }, [farmStorage]);

  useEffect(() => {
    async function setTotalStaked() {
      farm.totalStaked = await getTotalStaked();
    }

    async function setAPR() {
      farm.APR = await estimateAPR(farmStorage!);
    }

    async function initFarmStats() {
      if (farmStorage) {
        await setTotalStaked();
        await setAPR();
      }
      setFarm(farm);
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

  const generateQrCode = (): { __html: string } => {
    const qr = qrcode(0, "L");
    qr.addData(publicToken || "");
    qr.make();

    return { __html: qr.createImgTag(4) };
  };

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

    // PRODUCTION
    //const swapContractStorage = storage;
    const dexTokenPool = swapContractStorage.storage.token_pool as BigNumber;
    const blocksPerYear = 365 * 24 * 60;
    const APR = farmStorage.farm.plannedRewards.rewardPerBlock
      .multipliedBy(blocksPerYear)
      .dividedBy(dexTokenPool.multipliedBy(await getTotalStaked()))
      .dividedBy(100) // because of decimal difference of 100 between CVZA and XTZ
      .multipliedBy(100); // to get percentage

    return APR.toFixed();
  }

  async function delegatorReward() {
    const newContract = await Tezos.wallet.at(farmContract);
    const newStorage = await newContract.storage<farmContractStorage>();
    const delegatorAddress = await Tezos.wallet.pkh();
    const delegatorRecord = await newStorage.delegators.get(delegatorAddress);
    if (!delegatorRecord) {
      return new BigNumber(0).toString();
    }

    const accRewardPerShareStart =
      delegatorRecord.accumulatedRewardPerShareStart;
    const accRewardPerShareEnd = await updateAccumulatedRewardPerShare(
      farmStorage!
    );
    const accRewardPerShare = accRewardPerShareEnd.minus(
      accRewardPerShareStart
    );
    const delegatorReward = accRewardPerShare.multipliedBy(
      delegatorRecord.lpTokenBalance
    );

    // remove precision and specify max decimals of reward token
    const rewardTokenDecimals = 1000000000;
    const estimatedDelegatorReward = delegatorReward
      .dividedBy(1000000 * rewardTokenDecimals)
      .toFixed(6);

    return estimatedDelegatorReward;
  }

  async function getTotalStaked() {
    const tezos = new TezosToolkit(config.rpcUrl);
    const farmContractInstance = await tezos.contract.at(farmContract);
    const farmContractStorage =
      await farmContractInstance.storage<farmContractStorage>();
    // divided by the token decimals of the LP token
    const totalStaked = farmContractStorage.farmLpTokenBalance
      .dividedBy(1000000)
      .toFixed(6);
    // we return string because of javascript problems for really big numbers
    return totalStaked.toString();
  }

  async function getPersonalStake(
    farmStorage: farmContractStorage
  ): Promise<string> {
    const delegatorAddress = await Tezos.wallet.pkh();
    const delegatorRecord = await farmStorage.delegators.get(delegatorAddress);

    if (!delegatorRecord) {
      return new BigNumber(0).toString();
    }
    const personalStake = delegatorRecord.lpTokenBalance.toString();

    return personalStake;
  }

  async function deposit() {
    // check whether there is already an allowance
    const contractIsOperator = await hasOperator();

    // TODO: read deposit value from an input field
    // eg. 10.3 * 1,000,000 = 10,300,000
    const depositValueBigNumber = new BigNumber(depositValue).multipliedBy(
      config.lpTokenDecimals
    );
    const depositOperationPromise = depositToFarm(depositValueBigNumber);

    /**
     * Approve and then deposit
     */
    if (!contractIsOperator) {
      const addOperatorTransactionPromise = tokenFA2AddOperator();

      const batch = await Tezos.wallet
        .batch()
        .withContractCall(await addOperatorTransactionPromise)
        .withContractCall(await depositOperationPromise);

      await batch.send();
    } else {
    /**
     * Only deposit
     */
      //   const depositStorageLimit = await estimateDepositStorageLimit(1)
      //   const storageLimit = depositStorageLimit * storageLimitSurcharge;
      //   const sendParameters = {
      //     amount: 0,
      //     storageLimit: storageLimit
      //   };

      await (await depositOperationPromise).send();
    }
  }

  async function tokenFA2AddOperator() {
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

  async function estimateTokenFA2AddOperator() {
    const addOperatorTransferParameters = contract.methods
      .update_operators([
        {
          add_operator: {
            owner: userAddress,
            operator: farmContractInstance!.address,
          },
        },
      ])
      .toTransferParams();
    const addOperatorEstimate = await Tezos.estimate.transfer(
      addOperatorTransferParameters
    );
    const addOperatorStorageLimit = addOperatorEstimate.storageLimit;

    return addOperatorStorageLimit;
  }

  async function depositToFarm(amount: BigNumber) {
    const depositOperationPromise =
      farmContractInstance!.methods.deposit(amount);

    return depositOperationPromise;
  }

  async function estimateDepositStorageLimit(amount: BigNumber) {
    const depositTransferParameters = farmContractInstance!.methods
      .deposit(amount)
      .toTransferParams({});
    const depositEstimate = await Tezos.estimate.transfer(
      depositTransferParameters
    );
    const depositEstimateStorageLimit = depositEstimate.storageLimit;

    return depositEstimateStorageLimit;
  }

  async function estimateStorageLimitClaimAndUnstake(amount: BigNumber) {
    const withdrawOperationTransferParameters = farmContractInstance!.methods
      .withdraw(amount)
      .toTransferParams();
    const withdrawEstimate = await Tezos.estimate.transfer(
      withdrawOperationTransferParameters
    );
    const withdrawStorageLimit = withdrawEstimate.storageLimit;
    return withdrawStorageLimit;
  }

  async function claimAndUnstake() {
    const amount = new BigNumber(unstakeValue).multipliedBy(
      config.lpTokenDecimals
    );
    // const claimAndUnstakeStorageLimit =
    //   await estimateStorageLimitClaimAndUnstake(amount);
    // const storageLimit =
    //   claimAndUnstakeStorageLimit * config.storageLimitSurcharge;
    // const transferParameters = {
    //   storageLimit: storageLimit,
    // };
    return farmContractInstance!.methods.withdraw(amount).send();
  }

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

  async function estimateClaimStorage() {
    const claimOperationTransferParameters = farmContractInstance!.methods
      .claim(UnitValue)
      .toTransferParams();
    console.log(Tezos);
    const claimEstimate = await Tezos.estimate.transfer(
      claimOperationTransferParameters
    );
    const claimStorageLimit = claimEstimate.storageLimit;
    return claimStorageLimit;
  }

  async function claim() {
    // increasing storageLimit programmatically is optional
    // const claimStorageLimit = await estimateClaimStorage();
    // const storageLimit = claimStorageLimit * config.storageLimitSurcharge;
    // const transferParameters = {
    //   storageLimit: storageLimit,
    // };

    await farmContractInstance!.methods.claim(UnitValue).send(); // remove transferParameters for default storageLimit estimate
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

  return (
    <div className="section bg-gray-1">
      <div className="container">
        <div className="farm">
          <div className="farm-title-wrapper">
            <div className="farm-titel">
              <div className="farm-titel-inlay">
                <div>
                  <div>Total Staked</div>
                  <div id="totalStaked" className="totalstaked">
                    {farm.totalStaked}
                  </div>
                </div>
                <div className="align-right">
                  <div>Farming APR</div>
                  <div id="farmApy" className="farmapy">
                    {farm.APR}%
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
                    src="images/1_ZdaWerzN9F7oIyhZEwcRqQ-1.jpeg"
                    loading="lazy"
                    id="tokenImageInput"
                    alt=""
                  />
                </div>
              </div>
              <div>
                <div className="farm-coin">
                  <img
                    src="images/CVCA-COIN-ico-256.png"
                    loading="lazy"
                    id="tokenImageOutput"
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
          <h5>
            Deposit{" "}
            <span id="tokenNameInput" className="tokennameinput">
              $CVZA
            </span>{" "}
            to earn more
            <span id="tokenNameOutput" className="tokennameoutput">
              $CVZA
            </span>
          </h5>
          <div id="active" className="text-pill-tiny green">
            <div>Active</div>
          </div>
          <div id="ended" className="text-pill-tiny red">
            <div>Ended</div>
          </div>
          <div className="w-layout-grid farm-grid">
            <div className="label">Start date</div>
            <div id="startDate" className="farm-startdate">
              {farm.startDate}
            </div>
            <div className="label">End date</div>
            <div id="endDate" className="farm-enddate">
              {farm.endDate}
            </div>
            <div className="label">Your stake</div>
            <div id="yourStake" className="farm-yourstake">
              ${farm.personalStake}
            </div>
            <div className="label">Unclaimed $CVZA reward</div>
            <div id="cvzaReward" className="farm-cvzareward">
              ${farm.personalUnclaimedReward}
            </div>
          </div>
          {!userAddress && (
            <ConnectButton
              Tezos={Tezos}
              setPublicToken={setPublicToken}
              setWallet={setWallet}
              setUserAddress={setUserAddress}
              setBeaconConnection={setBeaconConnection}
              wallet={wallet}
            />
          )}

          {/* Disconnect */}
          {userAddress && (
            <DisconnectButton
              wallet={wallet}
              setPublicToken={setPublicToken}
              setUserAddress={setUserAddress}
              setWallet={setWallet}
              setTezos={setTezos}
              setBeaconConnection={setBeaconConnection}
            />
          )}
        </div>
        {userAddress && (
          <div className="w-layout-grid">
            <button
              id="deposit"
              onClick={() => deposit()}
              className="farm-buttons active w-node-a0b00265-cc69-ecc0-27bf-e20a6cfc0215-8f74eee8 w-inline-block"
            >
              <div className="button-label-main">Deposit</div>
              <div className="tiny-text _50">
                LP–<span className="tokennameinput">$CVZA</span>–
                <span className="tokennameoutput">$WSTD</span>
              </div>
            </button>
            <button
              id="claim"
              className="farm-buttons w-node-a43de16b-cb89-3d9f-34d1-dd123bfd99ee-8f74eee8 w-inline-block"
            >
              <div className="button-label-main" onClick={() => claim()}>
                Claim
              </div>
              <div className="tiny-text _50">
                <span className="tokennameinput">$CVZA</span> and{" "}
                <span className="tokennameoutput">$WSTD</span> reward
              </div>
            </button>
            <button
              id="withdraw"
              className="farm-buttons w-node-_58d63a0e-4a37-39e2-c3d7-2d81eefd4bbe-8f74eee8 w-inline-block"
            >
              <div
                className="button-label-main"
                onClick={() => claimAndUnstake()}
              >
                Claim & Unstake
              </div>
              <div className="tiny-text _50">
                LP–<span className="tokennameinput">$CVZA</span>–
                <span className="tokennameoutput">$WSTD</span>
              </div>
            </button>
          </div>
        )}
        <div className="div-block-11">
          <input
            type="number"
            className="form-farm w-input"
            name="depositAmount"
            data-name="depositAmount"
            placeholder="0.00"
            id="depositAmount-2"
            onChange={(e) => setDepositValue(e.target.value)}
          />
          <div className="div-block-18">
            <div>Pool Token to deposit</div>
            <div id="depositEstimateUsd" className="small-text align-right">
              {" "}
              ≈ $0.00
            </div>
          </div>
          <div className="div-block-17">
            <div className="div-block-19">
              <div className="farm-coin small coin-left">
                <img
                  src="images/1_ZdaWerzN9F7oIyhZEwcRqQ-1.jpeg"
                  loading="lazy"
                  id="tokenImageInput"
                  alt=""
                />
              </div>
              <div className="farm-coin small coin-right">
                <img
                  src="images/CVCA-COIN-ico-256.png"
                  loading="lazy"
                  id="tokenImageOutput"
                  alt=""
                />
                <div className="label">Pool Token</div>
              </div>
            </div>
          </div>
        </div>
        <div className="div-block-11">
          <input
            type="number"
            className="form-farm w-input"
            name="depositAmount"
            data-name="depositAmount"
            placeholder="0.00"
            id="depositAmount-2"
            onChange={(e) => setUnstakeValue(e.target.value)}
          />
          <div className="div-block-18">
            <div>Pool Token to Unstake</div>
            <div id="depositEstimateUsd" className="small-text align-right">
              {" "}
              ≈ $0.00
            </div>
          </div>
          <div className="div-block-17">
            <div className="div-block-19">
              <div className="farm-coin small coin-left">
                <img
                  src="images/1_ZdaWerzN9F7oIyhZEwcRqQ-1.jpeg"
                  loading="lazy"
                  id="tokenImageInput"
                  alt=""
                />
              </div>
              <div className="farm-coin small coin-right">
                <img
                  src="images/CVCA-COIN-ico-256.png"
                  loading="lazy"
                  id="tokenImageOutput"
                  alt=""
                />
                <div className="label">Pool Token</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Farm;

export type delegatorRecord = {
  lpTokenBalance: BigNumber;
  accumulatedRewardPerShareStart: BigNumber;
};

type address = string;
export interface farmContractStorage {
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
