const process = require('process')

const { buildingsList, calcBuildingPrice, calcBuildingResistance } = require('./buildingsUtils')
const { personnelList } = require('./personnelUtils')

const guardsInfo = personnelList.find(t => t.resource_id === 'guards')
const sabotsInfo = personnelList.find(t => t.resource_id === 'sabots')
const thievesInfo = personnelList.find(t => t.resource_id === 'thieves')

export const NEWBIE_ZONE_DAILY_INCOME = 750000
export const MAX_DAILY_ATTACKS = process.env.NODE_ENV === 'development' ? 999 : 3

export function calculateIsInAttackRange(attackerDailyIncome, defenderDailyIncome) {
  const maxIncome = attackerDailyIncome * 1.2 + 2000000
  const minIncome = (attackerDailyIncome - 2000000) / 1.2
  return defenderDailyIncome >= minIncome && defenderDailyIncome <= maxIncome
}

export function calculateMaxDailyReceivedAttacks(dailyIncome) {
  if (dailyIncome < 2e6) return 3
  if (dailyIncome < 4e6) return 4
  if (dailyIncome < 8e6) return 5
  return 6 + Math.ceil((dailyIncome - 15e6) / 10e6)
}

export function calculateMissionTime(missionType) {
  if (missionType === 'attack') return process.env.NODE_ENV === 'development' ? 5 : 300
  if (missionType === 'spy') return process.env.NODE_ENV === 'development' ? 5 : 120
  return 0
}

function getBuildingDestroyedProfit({ buildingID, buildingAmount, destroyedBuildings }) {
  const currentPrice = calcBuildingPrice(buildingID, buildingAmount)
  return Math.round((currentPrice * destroyedBuildings) / 2)
}

export function calcSabotsPower(sabotageResearchLvl) {
  return 2 * sabotsInfo.combatPower * sabotageResearchLvl
}
function calcThievesPower(sabotageResearchLvl) {
  return 2 * thievesInfo.combatPower * sabotageResearchLvl
}
export function calcGuardsPower(securityResearchLvl) {
  return 2 * guardsInfo.combatPower * securityResearchLvl
}

function simulateCombat({
  attackedBuildingInfo,
  buildingAmount,
  infraResearchLvl,
  attackerSabots,
  attackerThieves,
  defensorGuards,
  defensorSecurityLvl,
  attackerSabotageLvl,
}) {
  const guardsAttackPower = calcGuardsPower(defensorSecurityLvl) / 2
  const guardsDefensePower = calcGuardsPower(defensorSecurityLvl)
  const sabotAttackPower = calcSabotsPower(attackerSabotageLvl)
  const sabotDefensePower = calcSabotsPower(attackerSabotageLvl) / 2
  const thievesAttackPower = calcThievesPower(attackerSabotageLvl)
  const thievesDefensePower = calcThievesPower(attackerSabotageLvl) / 2

  // Simulamos lucha
  let deadSabots = 0
  let deadThieves = 0
  let deadGuards = 0
  let survivingSabots = attackerSabots
  let survivingThieves = attackerThieves
  let survivingGuards = defensorGuards

  if (survivingGuards > 0) {
    // kill sabots
    const maxDeadSabots = Math.floor((survivingGuards * guardsAttackPower) / sabotDefensePower)
    deadSabots = Math.min(attackerSabots, maxDeadSabots)
    survivingSabots = attackerSabots - deadSabots

    // kill guards
    const maxDeadGuardsFromSabots = Math.floor((attackerSabots * sabotAttackPower) / guardsDefensePower)
    deadGuards = Math.min(survivingGuards, maxDeadGuardsFromSabots)
    survivingGuards = survivingGuards - deadGuards
  }
  if (survivingGuards > 0) {
    // kill thieves
    const maxDeadThieves = Math.floor((survivingGuards * guardsAttackPower) / thievesDefensePower)
    deadThieves = Math.min(attackerThieves, maxDeadThieves)
    survivingThieves = attackerThieves - deadThieves

    // kill guards
    const maxDeadGuardsFromThieves = Math.floor((attackerThieves * thievesAttackPower) / guardsDefensePower)
    deadGuards = Math.min(survivingGuards, maxDeadGuardsFromThieves)
    survivingGuards = survivingGuards - deadGuards
  }

  // Destroyed buildings
  const buildingResistance = calcBuildingResistance(attackedBuildingInfo.id, infraResearchLvl)
  const attackPowerVsBuildings = Math.max(0, survivingSabots * sabotAttackPower + survivingThieves * thievesAttackPower)
  const theoreticalDestroyedBuildings = Math.floor(attackPowerVsBuildings / buildingResistance)
  const destroyedBuildings = Math.min(
    attackedBuildingInfo.maximumDestroyedBuildings,
    buildingAmount,
    theoreticalDestroyedBuildings
  )

  // Return data
  return {
    destroyedBuildings,
    deadGuards,
    deadSabots,
    survivingSabots,
    survivingGuards,
    survivingThieves,
  }
}

export function simulateAttack({
  buildingID,
  buildingAmount,
  defensorGuards,
  attackerSabots,
  attackerThieves,
  defensorSecurityLvl,
  attackerSabotageLvl,
  infraResearchLvl,
  unprotectedMoney,
}) {
  if (
    typeof buildingID === 'undefined' ||
    typeof buildingAmount === 'undefined' ||
    typeof defensorGuards === 'undefined' ||
    typeof attackerSabots === 'undefined' ||
    typeof attackerThieves === 'undefined' ||
    typeof defensorSecurityLvl === 'undefined' ||
    typeof attackerSabotageLvl === 'undefined' ||
    typeof infraResearchLvl === 'undefined' ||
    typeof unprotectedMoney === 'undefined'
  ) {
    throw new Error('Missing params for attack simulation')
  }
  const attackedBuildingInfo = buildingsList.find(b => b.id === buildingID)
  buildingID = parseInt(buildingID)
  buildingAmount = parseInt(buildingAmount)
  defensorGuards = parseInt(defensorGuards)
  attackerSabots = parseInt(attackerSabots)
  attackerThieves = parseInt(attackerThieves)
  defensorSecurityLvl = parseInt(defensorSecurityLvl)
  attackerSabotageLvl = parseInt(attackerSabotageLvl)
  infraResearchLvl = parseInt(infraResearchLvl)
  unprotectedMoney = parseInt(unprotectedMoney)

  const {
    deadSabots,
    deadGuards,
    survivingSabots,
    survivingGuards,
    survivingThieves,
    destroyedBuildings,
  } = simulateCombat({
    buildingAmount,
    attackedBuildingInfo,
    infraResearchLvl,
    attackerSabots,
    attackerThieves,
    defensorGuards,
    defensorSecurityLvl,
    attackerSabotageLvl,
  })

  const result = survivingGuards > 0 ? 'lose' : destroyedBuildings > 0 ? 'win' : 'draw'

  // Killed troops income
  const killedGuardsPrice = deadGuards * guardsInfo.price
  const killedSabotsPrice = deadSabots * sabotsInfo.price
  const incomeForKilledTroops = killedGuardsPrice * 0.1

  // Destroyed buildings income
  const incomeForDestroyedBuildings = getBuildingDestroyedProfit({
    buildingID,
    buildingAmount,
    destroyedBuildings,
  })

  // Robbing income
  const maxRobbedMoney = survivingThieves * thievesInfo.robbingPower
  const robbedMoney = Math.min(maxRobbedMoney, unprotectedMoney)

  // Misc calculations
  const attackerTotalIncome = incomeForKilledTroops + incomeForDestroyedBuildings + robbedMoney
  const realAttackerProfit = attackerTotalIncome - killedSabotsPrice
  const gainedFame = destroyedBuildings * attackedBuildingInfo.fame

  return {
    result,
    survivingGuards,
    survivingSabots,
    survivingThieves,
    gainedFame,
    destroyedBuildings,
    incomeForDestroyedBuildings,
    incomeForKilledTroops,
    attackerTotalIncome,
    realAttackerProfit,
    robbedMoney,
  }
}

export function calcSendableSpies(spyResearchLvl) {
  return Math.ceil(3 * Math.pow(Math.E, 0.11 * spyResearchLvl))
}
