import mysql from '../../../lib/mysql'
import { getAllianceRankPosition, getBasicData as getAllianceBasicData } from '../../../lib/db/alliances'
import NewsItem, { newsItemTypes, rankPositionToWeightVal } from '../NewsItem'
import { WAR_DAYS_DURATION } from 'shared-lib/allianceUtils'

export async function generate({ dayID, minTimestamp, maxTimestamp }) {
  minTimestamp = minTimestamp - WAR_DAYS_DURATION * 60 * 60 * 24
  maxTimestamp = maxTimestamp - WAR_DAYS_DURATION * 60 * 60 * 24

  let allWarDeclarations = await mysql.query(
    'SELECT id, alliance1_id, alliance2_id FROM alliances_wars WHERE created_at BETWEEN ? AND ?',
    [minTimestamp, maxTimestamp]
  )
  allWarDeclarations = await Promise.all(
    allWarDeclarations.map(async war => {
      const [rank1, rank2] = await Promise.all([
        getAllianceRankPosition(war.alliance1_id),
        getAllianceRankPosition(war.alliance2_id),
      ])
      const rankWeight = (rankPositionToWeightVal(rank1) + rankPositionToWeightVal(rank2)) / 2
      const typeWeight = 1.8

      return new NewsItem({
        type: newsItemTypes.WAR_ENDED,
        weight: rankWeight + typeWeight,
        data: { warID: war.id },
      })
    })
  )

  return allWarDeclarations
}

export async function get({ warID }) {
  const war = await mysql.selectOne('SELECT alliance1_id, alliance2_id, data FROM alliances_wars WHERE id=?', [warID])

  const [alliance1, alliance2] = await Promise.all([
    getAllianceBasicData(war.alliance1_id),
    getAllianceBasicData(war.alliance2_id),
  ])

  // TODO: Use JSON.parse(war.data) to get war result

  return { alliance1, alliance2 }
}
