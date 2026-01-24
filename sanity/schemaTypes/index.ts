import { type SchemaTypeDefinition } from 'sanity'
import { propertyType } from './propertyType'
import { agentType } from './agentType'
import { reviewType } from './reviewType'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [propertyType, agentType, reviewType],
}
