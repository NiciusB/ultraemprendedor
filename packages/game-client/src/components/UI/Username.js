import React from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import styles from './Username.module.scss'
import AllianceLink from 'components/alliance/alliance-link'

Username.propTypes = {
  user: PropTypes.object,
}
export default function Username({ user }) {
  if (!user) return <span>Usuario desconocido</span>

  return (
    <span className={styles.container}>
      {user.accountData && (
        <Link className={styles.avatarLink} to={`/ranking/user/${user.username}`}>
          <img src={user.accountData.avatar} alt="" className={styles.avatar} />
        </Link>
      )}
      <div>
        <Link className={styles.usernameLink} to={`/ranking/user/${user.username}`}>
          {user.username}
        </Link>
        {user.alliance && <AllianceLink alliance={user.alliance} type="shortNameInBraces" />}
      </div>
    </span>
  )
}