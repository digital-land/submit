import { describe, it, expect } from 'vitest'
import { getDatasetGuidanceUrl } from '../../../src/filters/getDatasetConfig.js'

describe('getDatasetGuidanceUrl', () => {
  it('should return the correct guidance URL for a valid datasetId', () => {
    const result = getDatasetGuidanceUrl('article-4-direction')
    expect(result).toBe('/guidance/specifications/article-4-direction')
  })

  it('should return undefined for an invalid datasetId', () => {
    const result = getDatasetGuidanceUrl('invalidDataset')
    expect(result).toBeUndefined()
  })
})
