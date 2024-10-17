// Generates fake data based on a given schema, with controllable randomness for testing and demo purposes.
// Takes a schema and an optional seed, and returns fake data based on the schema.

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

  // this runs each and every time jsonSchemaFaker generates a random value, therefore to avoid all values being the same, we need it to change each time
  JSONSchemaFaker.option({
    random: () => {
      return generateNextRandomNumber(seed)
    }
  })

  const data = JSONSchemaFaker.generate(jsonSchema)

  const enhancedData = enhanceMockedData(data, jsonSchema)

  return enhancedData
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

const enhanceMockedData = (data, schema) => {
  if ('tableParams' in data) {
    data.tableParams = mockTableParams(data.tableParams, schema.properties.tableParams)
  }

  return data
}

const mockTableParams = (tableParams, schema) => {
  const columnSchema = schema.properties.columns
  columnSchema.minItems = 2
  columnSchema.maxItems = 10

  const columns = JSONSchemaFaker.generate(columnSchema)

  const fieldSchema = schema.properties.fields
  fieldSchema.minItems = columns.length
  fieldSchema.maxItems = columns.length
  fieldSchema.uniqueItems = true

  const fields = JSONSchemaFaker.generate(fieldSchema)

  const rowsSchema = { ...schema.properties.rows }
  rowsSchema.items.properties.columns.required = []

  const rowSchema = { ...schema.properties.rows.items.properties.columns.additionalProperties }
  rowSchema.oneOff = [
    { required: ['html'] },
    { required: ['value'] }
  ]
  rowSchema.additionalProperties = false

  fields.forEach(field => {
    rowsSchema.items.properties.columns.properties[field] = rowSchema
    rowsSchema.items.properties.columns.required.push(field)
  })

  rowsSchema.items.properties.columns.additionalProperties = false

  const rows = JSONSchemaFaker.generate(rowsSchema)

  tableParams = { columns, fields, rows }

  return tableParams
}
