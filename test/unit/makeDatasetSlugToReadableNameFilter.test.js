// makeDatasetSlugToReadableNameFilter.test.js
import { it, describe, expect } from 'vitest'
import { makeDatasetSlugToReadableNameFilter } from '../../src/filters/makeDatasetSlugToReadableNameFilter'

describe('makeDatasetSlugToReadableNameFilter', () => {
  const datasetNameMapping = new Map([
    ['dataset-slug-1', 'Dataset 1'],
    ['dataset-slug-2', 'Dataset 2']
  ])

  const filter = makeDatasetSlugToReadableNameFilter(datasetNameMapping)

  it('returns a function that takes a dataset slug and returns its corresponding readable name with lowercase first letter by default', () => {
    expect(filter('dataset-slug-1')).toBe('dataset 1')
    expect(filter('dataset-slug-2')).toBe('dataset 2')
  })

  it('capitalizes first letter when capitalize param is true', () => {
    expect(filter('dataset-slug-1', true)).toBe('Dataset 1')
    expect(filter('dataset-slug-2', true)).toBe('Dataset 2')
  })

  it('returns the original slug with lowercase first letter if it is not found in the dataset name mapping', () => {
    expect(filter('Unknown-slug')).toBe('unknown-slug')
    expect(filter('Unknown-slug', true)).toBe('Unknown-slug')
  })
})
