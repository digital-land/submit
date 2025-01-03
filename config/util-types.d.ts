import { ConfigSchema } from './util.js'
import { type InferOutput } from 'valibot'

export type Config = InferOutput<typeof ConfigSchema>
