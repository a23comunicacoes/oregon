import { abilitiesPlugin } from '@casl/vue'
import { ability, updateAbility } from './ability'

export default function (app) {
  const userAbilityRules = useCookie('userAbilityRules')

  let rules = []
  try {
    rules = Array.isArray(userAbilityRules.value)
      ? userAbilityRules.value
      : JSON.parse(userAbilityRules.value || '[]')
  } catch (_) {
    rules = []
  }

  updateAbility(rules)
  app.use(abilitiesPlugin, ability, { useGlobalProperties: true })
}
