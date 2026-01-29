import { useAbility as useCaslAbility } from '@casl/vue'
import { createMongoAbility } from '@casl/ability'

export const ability = createMongoAbility([])

export const useAbility = () => useCaslAbility()
