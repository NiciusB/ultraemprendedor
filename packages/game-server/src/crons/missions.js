import { doAttackMissions } from './missions/attacks'
import { doSpyMissions } from './missions/spying'

export const frequencyMs = 10 * 1000

export async function run() {
  await doAttackMissions()
  await doSpyMissions()
}
