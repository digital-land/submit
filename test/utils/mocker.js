// Generates fake data based on a given schema, with controllable randomness for testing and demo purposes.
// Takes a schema and an optional seed, and returns fake data based on the schema.

import { toJsonSchema } from '@valibot/to-json-schema'
import { JSONSchemaFaker } from 'json-schema-faker'

export default (schema, seed) => {
  const jsonSchema = toJsonSchema(schema)

  resetRandomNumberGenerator()

  // this runs each and every time jsonSchemaFaker generates a random value, therefore to avoid all values being the same, we need it to change each time
  JSONSchemaFaker.option({
    random: () => {
      return generateNextRandomNumber(seed)
    }
  })

  const data = JSONSchemaFaker.generate(jsonSchema)

  return data
}

let xorShiftSeed

const values = []

export const generateNextRandomNumber = (seed) => {
  try {
    if (!xorShiftSeed) {
      if (seed) {
        xorShiftSeed = seed
      } else {
        xorShiftSeed = new Date().getTime()
      }
    }
    xorShiftSeed ^= xorShiftSeed << 13 & 0xFFFFFFFF
    xorShiftSeed ^= xorShiftSeed >> 17 & 0xFFFFFFFF
    xorShiftSeed ^= xorShiftSeed << 5 & 0xFFFFFFFF
    const randomValue = Math.abs(xorShiftSeed / 0x100000000) % 1
    values.push(randomValue)
    return randomValue
  } catch (e) {
    console.log(e)
    throw e
  }
}

export const resetRandomNumberGenerator = () => {
  xorShiftSeed = undefined
}
