import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../lib/api'
import UserActionLinks from '../../components/UI/user-action-links'
import IncContainer from 'components/UI/inc-container'
import UserLink from 'components/UI/user-link'

export default function Monopolies() {
  const { contestName } = useParams()
  const [contestScores, setContestScores] = useState([])
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get(`/v1/contests/${contestName}`)
      .then(res => {
        setContestScores(res.contestInfo)
      })
      .catch(err => setError(err.message))
  }, [contestName])

  return (
    <IncContainer darkBg>
      <div style={{ padding: 10 }}>
        {error && <h4>{error}</h4>}
        <h2>{contestName}</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Nombre de usuario</th>
              <th>Puntos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contestScores && contestScores.length ? (
              contestScores.map(contestScore => (
                <tr key={contestScore.id}>
                  <td>{contestScore.rank && contestScore.rank.toLocaleString()}</td>
                  <td>
                    <UserLink user={contestScore.user} />
                  </td>
                  <td>{contestScore.score && contestScore.score.toLocaleString()} puntos</td>
                  <td>
                    <UserActionLinks user={contestScore.user} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td>No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </IncContainer>
  )
}
