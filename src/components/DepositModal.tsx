
import BigNumber from "bignumber.js";
import React, { Dispatch, SetStateAction } from "react";
import PenaltyInfo from './PenaltyInfo';

interface DepositModalProps {
  hideDepositModal: Function
  depositValue: string
  setDepositValue: Dispatch<SetStateAction<string>>
  personalMaxDeposit: BigNumber
  personalStake: BigNumber
  deposit: Function
  depositing: boolean
  symbol: string
  penalty?: {
    feePercentage: BigNumber
    periodSeconds: BigNumber
  }
  personalLastUpdate?: Date
}

const DepositModal = ({ hideDepositModal, depositValue, setDepositValue, personalMaxDeposit, personalStake, deposit, depositing, symbol, penalty, personalLastUpdate }: DepositModalProps) => {

  const value = new BigNumber(depositValue)
  const disabled = value.isZero() || value > personalMaxDeposit || depositing

  return (
    <div id="modalWrapper" className="modal-wrapper" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10 }} onClick={() => hideDepositModal()}>

      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3>Deposit</h3>
        <span id="killModal" className="link-block-2 w-inline-block" style={{cursor: 'pointer'}} onClick={() => hideDepositModal()}>
          <img loading="lazy" alt="" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/60a2b8ec3e22ca447f4b6063_nav-close-icon.svg" />
        </span>
        <div className="form-block-2 w-form">
          <form onSubmit={(event) => {deposit(); event.preventDefault();}}>

            <div className="div-block-11">
              <input
                type="number"
                className="form-farm w-input"
                name="depositAmount"
                data-name="depositAmount"
                placeholder="0.00"
                id="depositAmount-2"
                value={depositValue}
                disabled={depositing}
                onChange={(e) => setDepositValue(e.target.value)}
              />
              <div className="div-block-18">
                <div>Pool Token</div>
                <div id="depositEstimateUsd" className="small-text align-right">
                  <span onClick={() => setDepositValue(personalMaxDeposit.toString())} style={{ cursor: 'pointer' }}>MAX ({personalMaxDeposit.toString()})</span>
                </div>
              </div>
              <div className="div-block-17">
                <div className="div-block-19">
                  <div className="farm-coin small coin-left">
                    <img loading="lazy" id="tokenImageInput" alt="" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/60911d04b9836a75b1dfa271_CVCA-COIN-ico-256.png" />
                  </div>
                  <div className="farm-coin small coin-right">
                    <img loading="lazy" id="tokenImageOutput" alt="" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/6092c5a84ac959603b28b19c_1_ZdaWerzN9F7oIyhZEwcRqQ%20(1).jpeg" />
                    <div className="label">Pool Token</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-layout-grid farm-grid">
              <div id="w-node-_711fc696-7ac7-e6c8-120c-6f532e8df7bf-8f74eee8" className="label big">
                You Staked
              </div>
              <div id="TotalStaked" className="small-text align-right big w-node-_26bb2413-c0d4-5c9f-4953-309a53061659-8f74eee8">
                {personalStake.toNumber().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6})}&nbsp;${symbol}
              </div>
              {/* <div id="w-node-_3af69200-78c6-57b8-686c-10b9cbf7815d-8f74eee8" className="label">
                    Daily Earnings
                  </div>
                  <div id="dailyEarningsCvza" className="small-text align-right w-node-_3af69200-78c6-57b8-686c-10b9cbf7815f-8f74eee8">
                    0 $CVZA
                  </div>
                  <div id="dailyEarningsUsd" className="small-text align-right w-node-c0464df1-43ea-5fc9-f349-4f15ca11b4fc-8f74eee8">
                    $0.00
                  </div>
                  <div id="w-node-_3af69200-78c6-57b8-686c-10b9cbf78161-8f74eee8" className="label">
                    Monthly Earnings
                  </div>
                  <div id="monthlyEarningsCvza" className="small-text align-right w-node-_3af69200-78c6-57b8-686c-10b9cbf78163-8f74eee8">
                    0 $CVZA
                  </div>
                  <div id="monthlyEarningsUsd" className="small-text align-right w-node-_14ab1d8b-5dd7-c224-e270-848bdeef0918-8f74eee8">
                    $0.00
                  </div>
                  <div id="w-node-_3af69200-78c6-57b8-686c-10b9cbf78165-8f74eee8" className="label">
                    Yearly Earnings
                  </div>
                  <div id="yearlyEarningsCvza" className="small-text align-right w-node-_3af69200-78c6-57b8-686c-10b9cbf78167-8f74eee8">
                    0 $CVZA
                  </div>
                  <div id="yearlyEarningsUsd" className="small-text align-right w-node-_1dde12e2-aefb-d3dc-3339-5f7f3e97821c-8f74eee8">
                    $0.00
                  </div> */}
              
              { penalty && <PenaltyInfo penalty={penalty} personalLastUpdate={personalLastUpdate}></PenaltyInfo>}
            </div>

            <input
              type="submit"
              value={depositing ? 'Depositing...' : 'Deposit'}
              data-wait="Please wait..."
              id="depositConfirm"
              disabled={disabled}
              className={'button bg-primary-4 full-width w-button' + (disabled ? ' disabled' : '')}
            />
          </form>
        </div>
      </div>
    </div>
  )
}

export default DepositModal