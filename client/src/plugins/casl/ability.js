import { createMongoAbility } from '@casl/ability'

export const ability = createMongoAbility([])

export const updateAbility = (rules = []) => {
  ability.update(Array.isArray(rules) ? rules : [])
}
