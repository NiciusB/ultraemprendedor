import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import Username from '../UI/Username'
import { useUserData } from '../../lib/user'
import { post } from '../../lib/api'
import { LOAN_DAYS_DURATION } from 'shared-lib/loansUtils'

LoanListItem.propTypes = {
  loan: PropTypes.object.isRequired,
  refreshLoansList: PropTypes.func.isRequired,
}
export default function LoanListItem({ loan, refreshLoansList }) {
  const userData = useUserData()
  const isMine = loan.lender.id === userData.id

  const cancelLoan = useCallback(() => {
    post('/v1/loans/cancel')
      .then(res => {
        refreshLoansList()
      })
      .catch(err => {
        alert(err.message)
      })
  }, [refreshLoansList])

  const takeLoan = useCallback(
    lenderID => () => {
      post('/v1/loans/take', { lender_id: lenderID })
        .then(res => {
          refreshLoansList()
        })
        .catch(err => {
          alert(err.message)
        })
    },
    [refreshLoansList]
  )

  return (
    <div key={loan.lender.id}>
      <Username user={loan.lender} />
      <p>
        <b>Interés</b>: {loan.interest_rate.toLocaleString()}%
      </p>
      <p>
        <b>Dinero</b>: {loan.money_amount.toLocaleString()}€
      </p>
      <p>
        <b>Duración</b>: {LOAN_DAYS_DURATION.toLocaleString()} días
      </p>

      {isMine ? (
        <button type="button" onClick={cancelLoan}>
          Cancelar préstamo
        </button>
      ) : (
        <button type="button" onClick={takeLoan(loan.lender.id)}>
          Coger préstamo
        </button>
      )}
    </div>
  )
}