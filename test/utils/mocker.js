import { toJSONSchema } from '@gcornut/valibot-json-schema'
import { JSONSchemaFaker } from 'json-schema-faker'
import { date, number, string } from 'valibot'

export default (schema, seed) => {
  const jsonSchema = toJSONSchema({
    schema,
    ignoreUnknownValidation: true,
    customSchemaConversion: {
      // Treat set type like an array
      integer: (schema, converter) => converter(number(schema.value)),
      url: (schema, converter) => converter(string(schema.value)),
      iso_date_time: (schema, converter) => converter(date(schema.value))
    },
    dateStrategy: 'string'
  })

  resetRandomNumberGenerator()

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
