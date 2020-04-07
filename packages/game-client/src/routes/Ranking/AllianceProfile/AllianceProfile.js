import React, { useState, useEffect, useCallback } from 'react'
import api from 'lib/api'
import { useParams } from 'react-router-dom'
import { useUserData, reloadUserData } from 'lib/user'
import styles from './AllianceProfile.module.scss'
import RankItem from 'components/UI/RankItem'
import WarInfo from 'components/alliance/alliance-war-info'
import Container from 'components/UI/container'
import DeclareWarModal from 'components/alliance/declare-war-modal'
import UserLink from 'components/UI/UserLink'
import AllianceDetails from 'components/UI/alliance-details'

export default function Ranking() {
  const { allianceShortName } = useParams()
  const [alliance, setAlliance] = useState()
  const [isDeclareWarModalOpen, setIsDeclareWarModalOpen] = useState(false)
  const [error, setError] = useState()
  const userData = useUserData()

  const reloadAllianceData = useCallback(() => {
    api
      .get(`/v1/ranking/alliance/${allianceShortName}`)
      .then(res => {
        setAlliance(res.alliance)
      })
      .catch(err => setError(err.message))
  }, [allianceShortName])

  useEffect(() => {
    reloadAllianceData()
  }, [allianceShortName, reloadAllianceData])

  const createMemberRequest = () => {
    api
      .post('/v1/alliance/member_request/create', { alliance_id: alliance.id })
      .then(() => alert('Petición enviada'))
      .catch(err => alert(err.message))
  }

  const leaveAlliance = () => {
    if (!window.confirm('Estás seguro de que quieres salir?')) return
    api
      .post('/v1/alliance/leave')
      .then(() => {
        reloadAllianceData()
        reloadUserData()
      })
      .catch(err => {
        alert(err.message)
      })
  }

  if (error) return <h4>{error}</h4>

  if (!alliance) return <div>Cargando</div>

  return (
    <>
      <Container darkBg>
        <div className={styles.container}>
          <AllianceDetails alliance={alliance} />
          {!userData.alliance ? (
            <button onClick={createMemberRequest}>Pedir ser miembro</button>
          ) : userData.alliance.id === alliance.id ? (
            <button onClick={leaveAlliance}>Salir</button>
          ) : (
            userData.alliance_user_rank.permission_declare_war && (
              <button onClick={() => setIsDeclareWarModalOpen(true)}>Declarar guerra</button>
            )
          )}
        </div>
      </Container>
      <br />
      <Container darkBg>
        <div className={styles.container}>
          {alliance.members.map(member => {
            return (
              <RankItem
                key={member.user.id}
                rank={member.user.rank_position}
                pointsString={member.user.income.toLocaleString() + '€'}>
                <div>
                  <UserLink user={member.user} />
                </div>
                <div>{member.rank_name}</div>
              </RankItem>
            )
          })}
        </div>
      </Container>
      <br />
      <Container darkBg>
        <div className={styles.container}>
          <h2>Guerras activas</h2>
          {alliance.active_wars.map(war => {
            return <WarInfo war={war} key={war.id} />
          })}
        </div>
      </Container>
      <br />
      <Container darkBg>
        <div className={styles.container}>
          <h2>Guerras pasadas</h2>
          {alliance.past_wars.map(war => {
            return <WarInfo war={war} key={war.id} />
          })}
        </div>
      </Container>
      <DeclareWarModal
        isOpen={isDeclareWarModalOpen}
        onRequestClose={() => setIsDeclareWarModalOpen(false)}
        alliance={alliance}
      />
    </>
  )
}
