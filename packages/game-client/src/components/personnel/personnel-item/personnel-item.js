import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { reloadUserData } from 'lib/user'
import Card, { cardStyles } from 'components/card'
import api from 'lib/api'
import styles from './personnel-item.module.scss'
import Icon from 'components/icon'
import IncContainer from 'components/UI/inc-container'
import IncInput from 'components/UI/inc-input'

const personnelImages = {
  sabots: require('./img/gangster.png'),
  guards: require('./img/guard.png'),
  spies: require('./img/spy.png'),
  thieves: require('./img/thief.png'),
}
const personnelDesc = {
  sabots: 'Matan guardias y destruyen edificios',
  guards: 'Defienden contra ataques',
  spies: 'Obtienen información privada sobre otros jugadores',
  thieves: 'Roban dinero de edificios',
}

PersonnelItem.propTypes = {
  personnelInfo: PropTypes.object.isRequired,
  resourceAmount: PropTypes.number.isRequired,
}
export default function PersonnelItem({ personnelInfo, resourceAmount }) {
  const [hireAmount, setHireAmount] = useState('')
  const [fireAmount, setFireAmount] = useState('')

  const hireClicked = e => {
    e.preventDefault()
    api
      .post(`/v1/personnel/hire`, { resource_id: personnelInfo.resource_id, amount: hireAmount })
      .then(() => reloadUserData())
      .catch(err => {
        alert(err.message)
      })
  }
  const fireClicked = e => {
    e.preventDefault()
    api
      .post(`/v1/personnel/fire`, { resource_id: personnelInfo.resource_id, amount: fireAmount })
      .then(() => reloadUserData())
      .catch(err => {
        alert(err.message)
      })
  }

  return (
    <Card
      image={personnelImages[personnelInfo.resource_id]}
      title={personnelInfo.name}
      ribbon={resourceAmount.toLocaleString()}>
      <div>
        <div>{personnelDesc[personnelInfo.resource_id]}</div>
        <div className={styles.statTitle}>Coste diario actual</div>
        <div>
          {(personnelInfo.dailyMaintenanceCost * resourceAmount).toLocaleString()} <Icon iconName="money" size={16} />
        </div>
      </div>

      <br />

      <div>
        <IncInput
          showBorder
          className={styles.input}
          placeholder="0"
          type="number"
          value={hireAmount}
          onChangeText={setHireAmount}
        />
        <div className={styles.statContainer}>
          <div>
            <div className={styles.statTitle}>Coste de compra</div>
            <div>
              {(personnelInfo.price * hireAmount).toLocaleString()} <Icon iconName="money" size={16} />
            </div>
          </div>
          <div>
            <div className={styles.statTitle}>Mantenimiento diario</div>
            <div>
              {(personnelInfo.dailyMaintenanceCost * hireAmount).toLocaleString()} <Icon iconName="money" size={16} />
            </div>
          </div>
        </div>
        <IncContainer outerClassName={`${cardStyles.button} ${styles.button}`} onClick={hireClicked}>
          <h2 className={styles.buttonTitle}>{'CONTRATAR'}</h2>
        </IncContainer>
      </div>

      <br />

      <div>
        <IncInput
          showBorder
          className={styles.input}
          placeholder="0"
          type="number"
          value={fireAmount}
          onChangeText={setFireAmount}
        />
        <div>
          <div className={styles.statTitle}>Coste de despido</div>
          <div>
            {(personnelInfo.firingCost * fireAmount).toLocaleString()} <Icon iconName="money" size={16} />
          </div>
        </div>
        <IncContainer outerClassName={`${cardStyles.button} ${styles.button}`} onClick={fireClicked}>
          <h2 className={styles.buttonTitle}>{'DESPEDIR'}</h2>
        </IncContainer>
      </div>
    </Card>
  )
}
