import React, { useState } from 'react'
import { calcResourceMax } from 'shared-lib/allianceUtils'
import { personnelList } from 'shared-lib/personnelUtils'
import PropTypes from 'prop-types'
import { useUserData, reloadUserData } from 'lib/user'
import Container from 'components/UI/container'
import api from 'lib/api'
import UserLink from 'components/UI/UserLink'

AllianceResources.propTypes = {
  alliance: PropTypes.object.isRequired,
  reloadAllianceData: PropTypes.func.isRequired,
}
export default function AllianceResources({ alliance, reloadAllianceData }) {
  const userData = useUserData()

  return (
    <>
      <Container darkBg>
        <div style={{ padding: 10 }}>
          {Object.values(alliance.resources).map(resourceData => {
            return (
              <SingleResources
                key={resourceData.resource_id}
                researchs={alliance.researchs}
                resourceData={resourceData}
                userResourceAmount={userData.personnel[resourceData.resource_id] || 0}
                reloadAllianceData={reloadAllianceData}
              />
            )
          })}
        </div>
      </Container>
      <br />
      <Container darkBg>
        <div style={{ padding: 10 }}>
          <h2>Historial de recursos</h2>
          {alliance.resources_log.map(logEntry => {
            const resourceInfo = personnelList.find(r => r.resource_id === logEntry.resource_id)
            const resourceName = resourceInfo?.name || 'Dinero'
            return (
              <div key={Math.random()}>
                <UserLink user={logEntry.user} /> {logEntry.quantity > 0 ? 'metió' : 'sacó'}{' '}
                {Math.abs(logEntry.quantity).toLocaleString()} {resourceName}
              </div>
            )
          })}
        </div>
      </Container>
    </>
  )
}

SingleResources.propTypes = {
  resourceData: PropTypes.object.isRequired,
  researchs: PropTypes.object.isRequired,
  reloadAllianceData: PropTypes.func.isRequired,
  userResourceAmount: PropTypes.number.isRequired,
}
function SingleResources({ resourceData, reloadAllianceData, researchs, userResourceAmount }) {
  const [amount, setAmount] = useState(0)
  const max = calcResourceMax(resourceData.resource_id, researchs)

  const doResources = extracting => e => {
    e.preventDefault()
    api
      .post('/v1/alliance/resources', {
        resource_id: resourceData.resource_id,
        amount: (extracting ? -1 : 1) * amount,
      })
      .then(() => {
        reloadAllianceData()
        reloadUserData()
      })
      .catch(err => {
        alert(err.message)
      })
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <p>
        <b>{resourceData.name}:</b> {Math.floor(resourceData.quantity).toLocaleString()} / {max.toLocaleString()}
      </p>
      {resourceData.resource_id !== 'money' && <p>Tienes {userResourceAmount.toLocaleString()}</p>}
      <form>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} />{' '}
        <button onClick={doResources(true)}>Sacar</button> <button onClick={doResources(false)}>Meter</button>
      </form>
    </div>
  )
}
