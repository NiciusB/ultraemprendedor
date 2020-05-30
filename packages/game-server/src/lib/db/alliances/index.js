import { parseBadgeJSONFromDB } from './badge'
import mysql from '../../mysql'
import { getUserData } from '../users'
import { ALLIANCE_RESEARCHS, ALLIANCE_RESOURCES_LIST, calcResearchPrice } from 'shared-lib/allianceUtils'
import { getHoodData, getAllianceResearchBonusFromHoods } from '../hoods'

export const MAX_MEMBERS = 10

export async function getUserAllianceID(userID) {
  const [memberQuery] = await mysql.query('SELECT alliance_id FROM alliances_members WHERE user_id=?', [userID])
  return memberQuery ? memberQuery.alliance_id : false
}

export async function getUserAllianceRank(userID) {
  const [
    allianceMember,
  ] = await mysql.query(
    'SELECT alliance_id, rank_name, \
    permission_admin, permission_accept_and_kick_members, permission_extract_resources, permission_activate_buffs \
    FROM alliances_members WHERE user_id=?',
    [userID]
  )
  if (!allianceMember) return false

  return {
    alliance_id: allianceMember.alliance_id,
    rank_name: allianceMember.rank_name,
    permission_admin: Boolean(allianceMember.permission_admin),
    permission_accept_and_kick_members: Boolean(allianceMember.permission_accept_and_kick_members),
    permission_extract_resources: Boolean(allianceMember.permission_extract_resources),
    permission_activate_buffs: Boolean(allianceMember.permission_activate_buffs),
  }
}

export async function getAllianceBasicData(allianceID) {
  if (!allianceID) return false
  // Get basic alliance data
  const allianceData = await mysql.selectOne(
    'SELECT created_at, picture_url, long_name, short_name, description, badge_json, server_points FROM alliances WHERE id=?',
    [allianceID]
  )

  if (!allianceData) return false

  return {
    id: allianceID,
    created_at: allianceData.created_at,
    picture_url: allianceData.picture_url,
    long_name: allianceData.long_name,
    short_name: allianceData.short_name,
    description: allianceData.description,
    server_points: allianceData.server_points,
    badge: parseBadgeJSONFromDB(allianceData.badge_json),
  }
}

export async function getAllianceIDFromShortName(shortName) {
  const [allianceData] = await mysql.query('SELECT id FROM alliances WHERE short_name=?', [shortName])
  return allianceData ? allianceData.id : false
}

export async function getAllianceMembers(allianceID) {
  let members = await mysql.query(
    'SELECT user_id, rank_name, permission_admin FROM alliances_members WHERE alliance_id=?',
    [allianceID]
  )
  members = await Promise.all(
    members.map(async member => ({
      user: await getUserData(member.user_id),
      rank_name: member.rank_name,
      permission_admin: Boolean(member.permission_admin),
    }))
  )
  members = members.sort((a, b) => (a.user.income > b.user.income ? -1 : 1))
  return members
}

export async function getAllianceResearchs(allianceID) {
  const hoodBonuses = await getAllianceResearchBonusFromHoods(allianceID)
  const rawResearchs = await mysql.query(
    'SELECT id, level, progress_money FROM alliances_research WHERE alliance_id=?',
    [allianceID]
  )
  const researchs = Object.values(ALLIANCE_RESEARCHS)
    .map(research => {
      const data = rawResearchs.find(raw => raw.id === research.id)
      const bonusLvlsFromHoods =
        research.id === 2
          ? hoodBonuses.guards
          : research.id === 3
          ? hoodBonuses.sabots
          : research.id === 4
          ? hoodBonuses.thieves
          : 0
      const level = data ? data.level : 0
      return {
        id: research.id,
        level: level + bonusLvlsFromHoods,
        bonusLvlsFromHoods,
        price: calcResearchPrice(research.id, level),
        progress_money: data ? data.progress_money : 0,
      }
    })
    .reduce((prev, curr) => {
      prev[curr.id] = curr
      return prev
    }, {})

  return researchs
}

export async function getAllianceResources(allianceID) {
  const rawResources = await mysql.query('SELECT resource_id, quantity FROM alliances_resources WHERE alliance_id=?', [
    allianceID,
  ])
  const resources = {
    sabots: 0,
    guards: 0,
    thieves: 0,
  }
  ALLIANCE_RESOURCES_LIST.forEach(res => {
    const resData = rawResources.find(raw => raw.resource_id === res.resource_id)
    if (resData) resources[res.resource_id] = parseInt(resData.quantity)
  })
  return resources
}

export async function getAllianceResourcesLog(allianceID) {
  const rawLog = await mysql.query(
    'SELECT user_id, created_at, resource_id, type, quantity FROM alliances_resources_log WHERE alliance_id=? ORDER BY created_at DESC LIMIT 30',
    [allianceID]
  )
  const resourcesLog = await Promise.all(
    rawLog.map(async raw => {
      return {
        user: await getUserData(raw.user_id),
        created_at: raw.created_at,
        type: raw.type,
        resource_id: raw.resource_id,
        quantity: raw.quantity,
      }
    })
  )
  return resourcesLog
}

export async function getAllianceResearchLog(allianceID) {
  const rawLog = await mysql.query(
    'SELECT user_id, created_at, research_id, money FROM alliances_research_log WHERE alliance_id=? ORDER BY created_at DESC LIMIT 20',
    [allianceID]
  )
  const researchLog = await Promise.all(
    rawLog.map(async raw => {
      return {
        user: await getUserData(raw.user_id),
        created_at: raw.created_at,
        research_id: raw.research_id,
        money: raw.money,
      }
    })
  )
  return researchLog
}

export async function getAllianceResearchShares(allianceID) {
  const rawShares = await mysql.query(
    'SELECT user_id, SUM(money) as total FROM alliances_research_log WHERE alliance_id=? GROUP BY user_id ORDER BY total DESC',
    [allianceID]
  )
  const researchShares = await Promise.all(
    rawShares.map(async raw => {
      return {
        user: await getUserData(raw.user_id),
        total: parseInt(raw.total),
      }
    })
  )
  return researchShares
}

export async function getAllianceBuffsData(allianceID) {
  const [
    buffsLastUsed,
  ] = await mysql.query('SELECT buff_attack_last_used, buff_defense_last_used FROM alliances WHERE id=?', [allianceID])

  const now = Math.floor(Date.now() / 1000)

  return {
    attack: {
      active: now - buffsLastUsed.buff_attack_last_used < 60 * 60 * 2,
      can_activate: now - buffsLastUsed.buff_attack_last_used > 60 * 60 * 24 * 2,
      last_used: buffsLastUsed.buff_attack_last_used,
    },
    defense: {
      active: now - buffsLastUsed.buff_defense_last_used < 60 * 60 * 2,
      can_activate: now - buffsLastUsed.buff_defense_last_used > 60 * 60 * 24 * 2,
      last_used: buffsLastUsed.buff_defense_last_used,
    },
  }
}

export async function getAllianceResearchBonusFromBuffs(allianceID) {
  if (!allianceID) {
    return {
      attack: 0,
      defense: 0,
    }
  }
  const [buffsData, researchs] = await Promise.all([getAllianceBuffsData(allianceID), getAllianceResearchs(allianceID)])

  const bonusAttackLvls = buffsData.attack.active ? researchs[5].level + 1 : 0
  const bonusDefenseLvls = buffsData.defense.active ? researchs[6].level + 1 : 0

  return {
    attack: bonusAttackLvls,
    defense: bonusDefenseLvls,
  }
}

export async function getActiveWarBetweenAlliances(allianceID1, allianceID2) {
  const [
    war,
  ] = await mysql.query(
    'SELECT id FROM alliances_wars WHERE completed=0 AND ((alliance1_id=? AND alliance2_id=?) OR (alliance2_id=? AND alliance1_id=?))',
    [allianceID1, allianceID2, allianceID1, allianceID2]
  )
  if (!war) return null

  return {
    id: war.id,
  }
}

export async function getAllianceActiveWars(allianceID) {
  let activeWars = await mysql.query(
    'SELECT id FROM alliances_wars WHERE completed=0 AND (alliance1_id=? OR alliance2_id=?) ORDER BY created_at DESC',
    [allianceID, allianceID]
  )
  activeWars = await Promise.all(activeWars.map(war => getWarData(war.id)))

  return activeWars
}

export async function getAlliancePastWars(allianceID) {
  let pastWars = await mysql.query(
    'SELECT id FROM alliances_wars WHERE completed=1 AND (alliance1_id=? OR alliance2_id=?) ORDER BY created_at DESC LIMIT 10',
    [allianceID, allianceID]
  )
  pastWars = await Promise.all(pastWars.map(war => getWarData(war.id)))

  return pastWars
}

export async function getWarData(warID, { includeRawData = false } = {}) {
  const war = await mysql.selectOne(
    'SELECT id, created_at, alliance1_id, alliance2_id, data, alliance1_hoods, alliance2_hoods FROM alliances_wars WHERE id=?',
    [warID]
  )

  const alliance1 = await getAllianceBasicData(war.alliance1_id)
  const alliance2 = await getAllianceBasicData(war.alliance2_id)

  // alliance2_hoods is set when war is declared, but alliance1_hoods might take up to 24h
  let alliance1Hoods = []
  let alliance2Hoods = []
  if (war.alliance1_hoods) {
    alliance1Hoods = await Promise.all(war.alliance1_hoods.split(',').map(getHoodData))
  }
  alliance2Hoods = await Promise.all(war.alliance2_hoods.split(',').map(getHoodData))

  const data = JSON.parse(war.data)
  const days = data.days
  const winner = data.winner

  const alliance1Aids = []
  const alliance2Aids = []
  const warAids = await mysql.query(
    'SELECT aided_alliance_id, aiding_alliance_id, accepted_at FROM alliances_wars_aid WHERE war_id=? AND accepted=1',
    [warID]
  )
  await Promise.all(
    warAids.map(async aid => {
      const aidingAlliance = await getAllianceBasicData(aid.aiding_alliance_id)
      const arrayToAppend = aid.aided_alliance_id === alliance1.id ? alliance1Aids : alliance2Aids
      arrayToAppend.push({
        alliance: aidingAlliance,
        accepted_at: aid.accepted_at,
      })
    })
  )

  const result = {
    id: war.id,
    created_at: war.created_at,
    days,
    winner,
    alliance1_hoods: alliance1Hoods,
    alliance2_hoods: alliance2Hoods,
    alliance1_aids: alliance1Aids,
    alliance2_aids: alliance2Aids,
    alliance1: alliance1,
    alliance2: alliance2,
    _data: data,
  }
  if (!includeRawData) delete result._data
  return result
}

export async function deleteAlliance(allianceID) {
  await Promise.all([
    mysql.query('DELETE FROM alliances WHERE id=?', [allianceID]),
    mysql.query('DELETE FROM alliances_member_requests WHERE alliance_id=?', [allianceID]),
    mysql.query('DELETE FROM alliances_members WHERE alliance_id=?', [allianceID]),
    mysql.query('DELETE FROM alliances_research WHERE alliance_id=?', [allianceID]),
    mysql.query('DELETE FROM alliances_research_log WHERE alliance_id=?', [allianceID]),
    mysql.query('DELETE FROM alliances_resources WHERE alliance_id=?', [allianceID]),
    mysql.query('DELETE FROM alliances_resources_log WHERE alliance_id=?', [allianceID]),
    mysql.query('DELETE FROM alliances_wars WHERE alliance1_id=? OR alliance2_id=?', [allianceID, allianceID]),
    mysql.query('DELETE FROM ranking_alliances WHERE alliance_id=?', [allianceID]),
  ])
}

export async function getAllianceRankData(allianceID) {
  const rankRow = await mysql.selectOne('SELECT rank, points FROM ranking_alliances WHERE alliance_id=?', [allianceID])
  if (!rankRow) return null
  return {
    rank: rankRow.rank,
    points: rankRow.points,
  }
}
