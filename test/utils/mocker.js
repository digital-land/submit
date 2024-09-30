import { toJSONSchema } from '@gcornut/valibot-json-schema'
import { JSONSchemaFaker } from 'json-schema-faker'
import { date, number, string } from 'valibot'

export default (schema) => {
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

  return JSONSchemaFaker.generate(jsonSchema)
}
