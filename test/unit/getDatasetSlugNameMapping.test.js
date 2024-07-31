import { vi, it, describe, expect } from 'vitest'
import datasette from '../../src/services/datasette.js'
import { getDatasetSlugNameMapping } from '../../src/utils/datasetteQueries/getDatasetSlugNameMapping.js'

// Mock datasette.runQuery to return a fake response
vi.mock('../../src/services/datasette.js', () => ({
  default: {
    runQuery: vi.fn()
  }
}))

describe('getDatasetSlugNameMapping', () => {
  it('returns a Map with dataset slugs as keys and names as values', async () => {
    datasette.runQuery.mockResolvedValue({
      rows: [
        ['dataset-slug-1', 'Dataset Name 1'],
        ['dataset-slug-2', 'Dataset Name 2']
      ]
    })

    const result = await getDatasetSlugNameMapping()

    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(2)
    expect(result.get('dataset-slug-1')).toBe('Dataset Name 1')
    expect(result.get('dataset-slug-2')).toBe('Dataset Name 2')
  })

  it('throws an error if datasette.runQuery fails', async () => {
    datasette.runQuery.mockRejectedValue(new Error('Error running query'))

    await expect(getDatasetSlugNameMapping()).rejects.toThrowError('Error running query')
  })
})
