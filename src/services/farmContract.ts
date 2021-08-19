import { ContractAbstraction, MichelsonMap, TezosToolkit, UnitValue, Wallet } from '@taquito/taquito';
import BigNumber from "bignumber.js";

type DelegatorRecord = {
  lpTokenBalance: BigNumber;
  accumulatedRewardPerShareStart: BigNumber;
};

type Address = string;
export interface FarmStorageInterface {
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
  delegators: MichelsonMap<Address, DelegatorRecord>;
  addresses: {
    admin: Address;
    lpTokenContract: Address;
    rewardTokenContract: Address;
    penaltyPayoutAddress: Address;
    rewardReserve: Address;
  };
}

// TODO: check if calculation is right
/**
 * Formula
 * APR = Total LP staked expressed as reward token / yearly reward in reward token
 *     = yearly reward / dexStorage.token_pool * LP
 *     = (reward per block * blocks per year) / dexStorage.token_pool * LP
 */
export async function estimateAPR(
  farmStorage: FarmStorageInterface
) {
  //FOR TESTING PLEASE REMOVE
  const tezos2 = new TezosToolkit("https://rpc.tzbeta.net");
  const swapContractInstance = await tezos2.contract.at(
    "KT1F3BqwEAoa2koYX4Hz7zJ8xfGSxxAGVT8t"
  );
  const swapContractStorage = await swapContractInstance.storage<any>();
  const dexTokenPool = swapContractStorage.storage.token_pool as BigNumber;
  const blocksPerYear = 365 * 24 * 60;
  const APR = farmStorage.farm.plannedRewards.rewardPerBlock
    .multipliedBy(blocksPerYear)
    .dividedBy(dexTokenPool.multipliedBy(await getTotalStaked(farmStorage)))
    //.dividedBy(100) // because of decimal difference of 100 between CVZA and XTZ
    .multipliedBy(100); // to get percentage

  return APR;
}

async function updateAccumulatedRewardPerShare(
  Tezos: TezosToolkit,
  farmStorage: FarmStorageInterface
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

export async function delegatorReward(
  Tezos: TezosToolkit,
  farmStorage: FarmStorageInterface
) {
  const delegatorAddress = await Tezos.wallet.pkh();
  const delegatorRecord = await farmStorage.delegators.get(delegatorAddress);
  if (!delegatorRecord) {
    return new BigNumber(0);
  }

  const accRewardPerShareStart = delegatorRecord.accumulatedRewardPerShareStart;
  const accRewardPerShareEnd = await updateAccumulatedRewardPerShare(Tezos, farmStorage);
  const accRewardPerShare = accRewardPerShareEnd.minus(
    accRewardPerShareStart
  );
  const delegatorReward = accRewardPerShare.multipliedBy(
    delegatorRecord.lpTokenBalance.shiftedBy(-6)
  );

  return delegatorReward;
}

export async function getTotalStaked(
  farmStorage: FarmStorageInterface
) {
  return farmStorage.farmLpTokenBalance;
}

export async function getPersonalStake(
  Tezos: TezosToolkit,
  farmStorage: FarmStorageInterface
): Promise<BigNumber> {
  const delegatorAddress = await Tezos.wallet.pkh();
  const delegatorRecord = await farmStorage.delegators.get(delegatorAddress);
  if (!delegatorRecord) {
    return new BigNumber(0);
  }
  return delegatorRecord.lpTokenBalance
}

/**
  * This function checks whether the user has already given an allowance to the farm.
  *
  * Token holders can give other addresses (and therefore smart contacts)
  * an "allowance" to spend tokens on their behalf.
  * For FA1.2 the entrypoint is called %approve or %approveCAS,
  * in FA2 it is %update_operators.
  */
async function hasOperator(
  Tezos: TezosToolkit,
  farmContractInstance: ContractAbstraction<Wallet>,
  swapStorage: any,
) {
  /**
   * this line needs to be changed depending on the storage structure of the contract
   * Quipuswap will have a different FA2 storage implementation
   */
  const userAddress = await Tezos.wallet.pkh();
  const allowances = await swapStorage.tzip12.tokenOperators.get(userAddress);
  if (!allowances) {
    return false;
  }

  return farmContactIsOperator(farmContractInstance, allowances);
}

function farmContactIsOperator(
  farmContractInstance: ContractAbstraction<Wallet>,
  allowances: [string],
) {
  return allowances.includes(farmContractInstance!.address);
}

async function tokenFA2AddOperator(
  Tezos: TezosToolkit,
  swapContractInstance: ContractAbstraction<Wallet>,
  farmContractInstance: ContractAbstraction<Wallet>,
) {
  const userAddress = await Tezos.wallet.pkh();
  return swapContractInstance!.methods.update_operators([
    {
      add_operator: {
        owner: userAddress,
        operator: farmContractInstance!.address,
      },
    },
  ]);
}

export async function performDeposit(
  Tezos: TezosToolkit,
  swapContractInstance: ContractAbstraction<Wallet>,
  farmContractInstance: ContractAbstraction<Wallet>,
  swapStorage: any,
  amount: BigNumber) {
  // check whether there is already an allowance
  const contractIsOperator = await hasOperator(Tezos, farmContractInstance, swapStorage);
  const depositOperation = farmContractInstance!.methods.deposit(amount);

  if (!contractIsOperator) {
    // Approve and then deposit
    const addOperatorTransactionPromise = tokenFA2AddOperator(Tezos, swapContractInstance, farmContractInstance);
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

export async function performWithdraw(farmContractInstance: ContractAbstraction<Wallet>, amount: BigNumber) {
  const tx = await farmContractInstance!.methods.withdraw(amount).send();
  await tx.confirmation(1)
  return tx
}

export async function performClaim(farmContractInstance: ContractAbstraction<Wallet>) {
  const tx = await farmContractInstance!.methods.claim(UnitValue).send();
  await tx.confirmation(1)
  return tx
}
