
import BigNumber from "bignumber.js";
import React, { Dispatch, SetStateAction } from "react";
import PenaltyInfo from './PenaltyInfo';

interface WithdrawModalProps {
  hideWithdrawModal: Function
  withdrawValue: string
  setWithdrawValue: Dispatch<SetStateAction<string>>
  personalStake: BigNumber
  withdraw: Function
  withdrawing: boolean
  symbol: string
  penalty?: {
    feePercentage: BigNumber
    periodSeconds: BigNumber
  }
  personalLastUpdate?: Date
}

const WithdrawModal = ({ hideWithdrawModal, withdrawValue, setWithdrawValue, personalStake, withdraw, withdrawing, symbol, penalty, personalLastUpdate }: WithdrawModalProps) => {

  const value = new BigNumber(withdrawValue)
  const disabled = value.isZero() || value.gt(personalStake) || withdrawing

  const parseWithdrawValue = (value: string) => {
    const parsed = value.replaceAll(',', '.')
    setWithdrawValue(parsed)
  }

  return (
    <div id="modalWrapper" className="modal-wrapper" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10 }} onClick={() => hideWithdrawModal()}>

      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3>Withdraw</h3>
        <span id="killModal" className="link-block-2 w-inline-block" style={{cursor: 'pointer'}} onClick={() => hideWithdrawModal()}>
          <img loading="lazy" alt="" src="https://uploads-ssl.webflow.com/6091079111aa5aff3f19582d/60a2b8ec3e22ca447f4b6063_nav-close-icon.svg" />
        </span>
        <div className="form-block-2 w-form">
          <form onSubmit={(event) => {withdraw(); event.preventDefault();}}>

            <div className="div-block-11">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9,.]*"
                className="form-farm w-input"
                name="depositAmount"
                data-name="depositAmount"
                placeholder="0.00"
                id="depositAmount-2"
                value={withdrawValue}
                disabled={withdrawing}
                onChange={(e) => parseWithdrawValue(e.target.value)}
                style={{paddingRight: 16}}
              />
              <div className="div-block-18">
                <div>Pool Token</div>
                <div id="depositEstimateUsd" className="small-text align-right">
                  <span onClick={() => setWithdrawValue(personalStake.toString())} style={{ cursor: 'pointer' }}>MAX ({personalStake.toString()})</span>
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
                {personalStake.toNumber().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} <span>${symbol}</span>
              </div>

              { penalty && <PenaltyInfo penalty={penalty} personalLastUpdate={personalLastUpdate}></PenaltyInfo>}
            </div>

            <input
              type="submit"
              value={withdrawing ? 'Withdrawing...' : 'Withdraw'}
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

export default WithdrawModal