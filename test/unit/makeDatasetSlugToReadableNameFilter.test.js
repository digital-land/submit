// makeDatasetSlugToReadableNameFilter.test.js
import { vi, it, describe, expect } from 'vitest'
import logger from '../../src/utils/logger.js'
import { makeDatasetSlugToReadableNameFilter } from '../../src/filters/makeDatasetSlugToReadableNameFilter'

describe('makeDatasetSlugToReadableNameFilter', () => {
  const datasetNameMapping = new Map([
    ['dataset-slug-1', 'Dataset 1'],
    ['dataset-slug-2', 'Dataset 2']
  ])

  const filter = makeDatasetSlugToReadableNameFilter(datasetNameMapping)

  it('returns a function that takes a dataset slug and returns its corresponding readable name', () => {
    expect(filter('dataset-slug-1')).toBe('Dataset 1')
    expect(filter('dataset-slug-2')).toBe('Dataset 2')
  })

  it('returns the original slug if it is not found in the dataset name mapping', () => {
    expect(filter('unknown-slug')).toBe('unknown-slug')
  })

  it('logs an warn if the provided slug is not found in the dataset name mapping', () => {
    const loggerWarningSpy = vi.spyOn(logger, 'warn')

    filter('unknown-slug')

    expect(loggerWarningSpy).toHaveBeenCalledTimes(1)
    expect(loggerWarningSpy).toHaveBeenCalledWith('can\'t find a name for unknown-slug')
  })
})
