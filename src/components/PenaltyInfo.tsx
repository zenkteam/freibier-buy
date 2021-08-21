
import BigNumber from "bignumber.js";
import React from "react";
import Clock from './Clock';

interface PenaltyInfoProps {
  penalty: {
    feePercentage: BigNumber
    periodSeconds: BigNumber
  }
  personalLastUpdate?: Date
}

const PenaltyInfo = ({ penalty, personalLastUpdate }: PenaltyInfoProps) => {

  let penaltyTimeString = ''
  const penaltyHours = penalty.periodSeconds.dividedBy(60 * 60)
  const penaltyDays = penaltyHours.dividedBy(24)
  if (penaltyHours.mod(24).isZero()) {
    if (penaltyDays.gt(1)) {
      penaltyTimeString = penaltyDays.toFixed() + ' days'
    } else {
      penaltyTimeString = penaltyDays.toFixed() + ' day'
    }
  } else {
    penaltyTimeString = penaltyHours.toFixed() + ' hours'
  }

  if (penalty.feePercentage.gt(0)) {
    return <>
      <div className="label">
        {penalty?.feePercentage.toNumber()}% fee for withdrawals within {penaltyTimeString}.
      </div>
      {personalLastUpdate &&
        <div className="small-text align-right">
          <Clock since={personalLastUpdate} durationInSeconds={penalty.periodSeconds.toNumber()}></Clock> left
        </div>
      }
    </>
  } else {
    return <></>
  }
}

export default PenaltyInfo