import React, { useState, useEffect } from 'react'
import styles from './map.module.scss'
import api from 'lib/api'
import AllianceLink from 'components/alliance/alliance-link'
import MissionModal from 'components/mission-modal'
import { numberToAbbreviation } from 'lib/utils'
import MapRenderer from './map-renderer/map-renderer'
import IncContainer from 'components/UI/inc-container'

export default function Map() {
  const [hoods, setHoods] = useState()
  const [attackModalHood, setAttackModalHood] = useState(false)

  useEffect(() => {
    api
      .get('/v1/map')
      .then(res => {
        setHoods(res.hoods)
      })
      .catch(err => alert(err.message))
  }, [])

  if (!hoods) return <div style={{ padding: 10 }}>Loading</div>
  return (
    <>
      {hoods && <MapRenderer hoods={hoods} />}
      <IncContainer darkBg>
        <div className={styles.container}>
          {hoods.map(hood => {
            return (
              <div key={hood.id}>
                <div>{hood.name}</div>
                {hood.owner && (
                  <div>
                    <AllianceLink alliance={hood.owner} />
                  </div>
                )}
                {!hood.owner && (
                  <>
                    <div>{numberToAbbreviation(hood.guards)} guardias</div>
                    <button onClick={() => setAttackModalHood(hood)}>Atacar</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </IncContainer>
      <MissionModal
        missionType="attack"
        hood={attackModalHood || undefined}
        isOpen={Boolean(attackModalHood)}
        onRequestClose={() => setAttackModalHood(false)}
      />
    </>
  )
}
