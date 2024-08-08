import {
  combineConfigs,
  validateConfig
} from '../../config/util.js'
import * as fs from 'fs'
import { describe, test, expect } from 'vitest'

describe('Validate configs for each environment', () => {
  const files = fs
    .readdirSync('./config', { withFileTypes: true })
    .filter((item) => item.isFile() && item.name.endsWith('.yaml'))
  for (const file of files) {
    test(`validating config: ${file.name}`, () => {
      const config = combineConfigs(file.name.replace('.yaml', ''))
      validateConfig(config)
      expect(true)
    })
  }
})
