import { ContractAbstraction, MichelsonMap, TezosToolkit, UnitValue, Wallet } from '@taquito/taquito';
import BigNumber from "bignumber.js";

type DelegatorRecord = {
  lpTokenBalance: BigNumber;
  accumulatedRewardPerShareStart: BigNumber;
  lastUpdate: Date;
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
    penalty: {
      feePercentage: BigNumber;
      periodSeconds: BigNumber;
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

/**
 * APR
 *  =        CVZA yearly reward         /                 CVZA staked
 *  = (block reward * blocks in 1 year) / (total CVZA-QP staked *      CVZA value of CVZA-QP         )
 *  = (block reward * blocks in 1 year) / (totalStaked          * swap.token_pool / swap.total_supply)
 */
export async function estimateAPR(
  farmStorage: FarmStorageInterface,
  swapStorage: any,
) {
  const blockReward = farmStorage.farm.plannedRewards.rewardPerBlock
  const blockTimeSeconds = 30
  const blocksPerYear = new BigNumber(365 * 24 * 60 * 60 / blockTimeSeconds)

  const totalStaked = await getTotalStaked(farmStorage)
  const swapTokenPool = swapStorage.storage.token_pool as BigNumber
  const swapTotalSupply = swapStorage.storage.total_supply as BigNumber

  const cvzaYearlyReward = blockReward.multipliedBy(blocksPerYear)
  const cvzaStaked = totalStaked.multipliedBy(swapTokenPool).dividedBy(swapTotalSupply)

  const APR = cvzaYearlyReward.dividedBy(cvzaStaked).multipliedBy(100) // to get percentage

  console.debug({
    blockReward: blockReward.toNumber(),
    blocksPerYear: blocksPerYear.toNumber(),
    totalStaked: totalStaked.toNumber(),
    swapTokenPool: swapTokenPool.toNumber(),
    swapTotalSupply: swapTotalSupply.toNumber(),
    cvzaYearlyReward: cvzaYearlyReward.toNumber(),
    cvzaStaked: cvzaStaked.toNumber(),
    APR: APR.toNumber(),
  })

  return APR
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

export async function delegatorRecord(
  Tezos: TezosToolkit,
  farmStorage: FarmStorageInterface
) {
  const delegatorAddress = await Tezos.wallet.pkh();
  const delegatorRecord = await farmStorage.delegators.get(delegatorAddress);
  if (delegatorRecord) {
    delegatorRecord.lastUpdate = new Date(delegatorRecord.lastUpdate)
  }
  return delegatorRecord
}

export async function delegatorReward(
  Tezos: TezosToolkit,
  farmStorage: FarmStorageInterface,
  delegatorRecord: DelegatorRecord,
) {
  const accRewardPerShareStart = delegatorRecord.accumulatedRewardPerShareStart;
  const accRewardPerShareEnd = await updateAccumulatedRewardPerShare(Tezos, farmStorage);
  const accRewardPerShare = accRewardPerShareEnd.minus(
    accRewardPerShareStart
  );
  const delegatorReward = accRewardPerShare.multipliedBy(
    delegatorRecord.lpTokenBalance.shiftedBy(-6)
  );

  console.debug({
    accRewardPerShareStart: accRewardPerShareStart.toString(),
    accRewardPerShareEnd: accRewardPerShareEnd.toString(),
    accRewardPerShare: accRewardPerShare.toString(),
    delegatorReward: delegatorReward.toString(),
    lpTokenBalance: delegatorRecord.lpTokenBalance.toString(),
  })
  return delegatorReward.isNaN() ? new BigNumber(0) : delegatorReward
}

export async function getTotalStaked(
  farmStorage: FarmStorageInterface
) {
  return farmStorage.farmLpTokenBalance;
}

export async function getPersonalStake(
  delegatorRecord: DelegatorRecord,
): Promise<BigNumber> {
  return delegatorRecord.lpTokenBalance
}

export async function getPersonalMaxDeposit(swapStorage: any, userAddress: string) {
  const user = await swapStorage.storage.ledger.get(userAddress)
  return user.balance
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

  // Quipuswap
  const allowances = await swapStorage.storage.ledger.get(userAddress).allowances

  // Testnet
  //const allowances = await swapStorage.tzip12.tokenOperators.get(userAddress);

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
        token_id: 0,
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
