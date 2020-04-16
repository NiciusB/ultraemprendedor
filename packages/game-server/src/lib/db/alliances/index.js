import { hoods } from '../../map'
import { parseBadgeJSONFromDB } from './badge'
const mysql = require('../../mysql')
const users = require('../users')
const { RESEARCHS_LIST, RESOURCES_LIST, calcResearchPrice } = require('shared-lib/allianceUtils')

export const MAX_MEMBERS = 10

export async function getUserAllianceID(userID) {
  const [memberQuery] = await mysql.query('SELECT alliance_id FROM alliances_members WHERE user_id=?', [userID])
  return memberQuery ? memberQuery.alliance_id : false
}

export async function getUserRank(userID) {
  const [
    allianceMember,
  ] = await mysql.query(
    'SELECT alliance_id, rank_name, \
    permission_admin, permission_accept_and_kick_members, permission_extract_money, permission_extract_troops, \
    permission_send_circular_msg, permission_activate_buffs, permission_declare_war \
    FROM alliances_members WHERE user_id=?',
    [userID]
  )
  if (!allianceMember) return false

  return {
    alliance_id: allianceMember.alliance_id,
    rank_name: allianceMember.rank_name,
    permission_admin: Boolean(allianceMember.permission_admin),
    permission_accept_and_kick_members: Boolean(allianceMember.permission_accept_and_kick_members),
    permission_extract_money: Boolean(allianceMember.permission_extract_money),
    permission_extract_troops: Boolean(allianceMember.permission_extract_troops),
    permission_send_circular_msg: Boolean(allianceMember.permission_send_circular_msg),
    permission_activate_buffs: Boolean(allianceMember.permission_activate_buffs),
    permission_declare_war: Boolean(allianceMember.permission_declare_war),
  }
}

export async function getBasicData(allianceID) {
  if (!allianceID) return false
  // Get basic alliance data
  const [
    allianceQuery,
  ] = await mysql.query(
    'SELECT created_at, picture_url, long_name, short_name, description, badge_json FROM alliances WHERE id=?',
    [allianceID]
  )

  if (!allianceQuery) return false

  return {
    id: allianceID,
    created_at: allianceQuery.created_at,
    picture_url: allianceQuery.picture_url,
    long_name: allianceQuery.long_name,
    short_name: allianceQuery.short_name,
    description: allianceQuery.description,
    badge: parseBadgeJSONFromDB(allianceQuery.badge_json),
  }
}

export async function getIDFromShortName(shortName) {
  const [allianceData] = await mysql.query('SELECT id FROM alliances WHERE short_name=?', [shortName])
  return allianceData ? allianceData.id : false
}

export async function getMembers(allianceID) {
  let members = await mysql.query(
    'SELECT user_id, rank_name, permission_admin FROM alliances_members WHERE alliance_id=?',
    [allianceID]
  )
  members = await Promise.all(
    members.map(async member => ({
      user: await users.getData(member.user_id),
      rank_name: member.rank_name,
      permission_admin: Boolean(member.permission_admin),
    }))
  )
  members = members.sort((a, b) => (a.user.income > b.user.income ? -1 : 1))
  return members
}

export async function getResearchs(allianceID) {
  const rawResearchs = await mysql.query(
    'SELECT id, level, progress_money FROM alliances_research WHERE alliance_id=?',
    [allianceID]
  )
  const researchs = RESEARCHS_LIST.map(research => {
    const data = rawResearchs.find(raw => raw.id === research.id)
    const level = data ? data.level : 0
    return {
      id: research.id,
      level,
      price: calcResearchPrice(research.id, level),
      progress_money: data ? data.progress_money : 0,
    }
  }).reduce((prev, curr) => {
    prev[curr.id] = curr
    return prev
  }, {})
  return researchs
}

export async function getResources(allianceID) {
  const rawResources = await mysql.query('SELECT resource_id, quantity FROM alliances_resources WHERE alliance_id=?', [
    allianceID,
  ])
  const resources = RESOURCES_LIST.map(res => {
    const resData = rawResources.find(raw => raw.resource_id === res.resource_id)
    return {
      resource_id: res.resource_id,
      name: res.name,
      quantity: resData ? parseInt(resData.quantity) : 0,
    }
  }).reduce((prev, curr) => {
    prev[curr.resource_id] = curr
    return prev
  }, {})
  return resources
}

export async function getResourcesLog(allianceID) {
  const rawLog = await mysql.query(
    'SELECT user_id, created_at, resource_id, quantity FROM alliances_resources_log WHERE alliance_id=? ORDER BY created_at DESC LIMIT 20',
    [allianceID]
  )
  const resourcesLog = await Promise.all(
    rawLog.map(async raw => {
      return {
        user: await users.getData(raw.user_id),
        created_at: raw.created_at,
        resource_id: raw.resource_id,
        quantity: raw.quantity,
      }
    })
  )
  return resourcesLog
}

export async function getResearchShares(allianceID) {
  const rawShares = await mysql.query(
    'SELECT user_id, SUM(money) as total FROM alliances_research_log WHERE alliance_id=? GROUP BY user_id ORDER BY total DESC',
    [allianceID]
  )
  const researchShares = await Promise.all(
    rawShares.map(async raw => {
      return {
        user: await users.getData(raw.user_id),
        total: parseInt(raw.total),
      }
    })
  )
  return researchShares
}

export async function getBuffsData(allianceID) {
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

export async function getResearchBonusFromBuffs(allianceID) {
  if (!allianceID) {
    return {
      2: 0,
      3: 0,
    }
  }
  const [buffsData, researchs] = await Promise.all([getBuffsData(allianceID), getResearchs(allianceID)])

  const bonusAttackLvls = buffsData.attack.active ? researchs[5].level + 1 : 0
  const bonusDefenseLvls = buffsData.defense.active ? researchs[6].level + 1 : 0

  return {
    2: bonusAttackLvls,
    3: bonusDefenseLvls,
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
    'SELECT id, created_at, alliance1_id, alliance2_id, data FROM alliances_wars WHERE completed=0 AND (alliance1_id=? OR alliance2_id=?) ORDER BY created_at DESC',
    [allianceID, allianceID]
  )
  activeWars = await Promise.all(activeWars.map(war => parseWar(allianceID, war)))

  return activeWars
}

export async function getAlliancePastWars(allianceID) {
  let pastWars = await mysql.query(
    'SELECT id, created_at, alliance1_id, alliance2_id, data FROM alliances_wars WHERE completed=1 AND (alliance1_id=? OR alliance2_id=?) ORDER BY created_at DESC LIMIT 10',
    [allianceID, allianceID]
  )
  pastWars = await Promise.all(pastWars.map(war => parseWar(allianceID, war)))

  return pastWars
}

async function parseWar(allianceID, war) {
  const alliance1 = await getBasicData(war.alliance1_id)
  const alliance2 = await getBasicData(war.alliance2_id)
  const combatant = war.alliance1_id === allianceID ? alliance2 : alliance1
  const data = JSON.parse(war.data)
  const attackedHoods = data.hoods.map(hoodID => {
    return hoods.find(h => h.id === hoodID)
  })
  const days = data.days
  const winner = data.winner
  return {
    id: war.id,
    created_at: war.created_at,
    combatant,
    days,
    winner,
    hoods: attackedHoods,
    alliance1: alliance1,
    alliance2: alliance2,
  }
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

export async function getAllianceRankPosition(allianceID) {
  const rankRow = await mysql.selectOne('SELECT rank FROM ranking_alliances WHERE alliance_id=?', [allianceID])
  return rankRow ? rankRow.rank : null
}

export function getAllianceHoods(allianceID) {
  return hoods.filter(hood => hood.owner && hood.owner.id === allianceID)
}