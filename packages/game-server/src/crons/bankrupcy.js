import mysql from '../lib/mysql'
import { getPersonnel } from '../lib/db/users'
import { personnelObj } from 'shared-lib/personnelUtils'
const frequencyMs = 60 * 1000

const BANKRUPCY_TIME_LIMIT = 60 * 60 // 1h

const run = async () => {
  const tsNow = Math.floor(Date.now() / 1000)
  await mysql.query(
    'UPDATE users SET bankrupcy_started_at=? WHERE bankrupcy_started_at IS NULL AND money<0 AND (SELECT SUM(quantity) FROM users_resources WHERE users_resources.user_id=users.id)>0',
    [tsNow]
  )

  const bankruptedUsers = await mysql.query('SELECT id FROM users WHERE bankrupcy_started_at<?', [
    tsNow - BANKRUPCY_TIME_LIMIT,
  ])
  await Promise.all(
    bankruptedUsers.map(async bankruptedUser => {
      const userID = bankruptedUser.id
      const personnel = await getPersonnel(userID)

      const troopsOrder = ['spies', 'sabots', 'thieves', 'guards']
      for (const troopType of troopsOrder) {
        if (personnel[troopType] <= 0) continue

        const lost = Math.ceil((personnel[troopType] * personnelObj[troopType].dailyMaintenanceCost) / 24 / 60 / 200)
        await mysql.query('UPDATE users_resources SET quantity=quantity-? WHERE user_id=? AND resource_id=?', [
          lost,
          userID,
          troopType,
        ])
        return
      }

      // No troops left
      await mysql.query('UPDATE users SET bankrupcy_started_at=NULL WHERE id=?', [userID])
    })
  )
}

module.exports = {
  run,
  frequencyMs,
}