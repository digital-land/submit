import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
// The ones tested
import { getDataSubjectMap, buildDataSubjects, makeDatasetSubjectMap } from '../../src/utils/datasetSubjectLoader.js'

// Import mocked modules
import fetchDatasetsFromProvisions from '../../src/utils/datasetteQueries/fetchDatasetsFromProvisions.js'
import { datasetSlugToReadableName } from '../../src/utils/datasetSlugToReadableName.js'
import { getDatasetCollectionSlugNameMapping } from '../../src/utils/datasetteQueries/fetchDatasetCollections.js'
import { getRedisClient } from '../../src/utils/datasetLoader.js'
import logger from '../../src/utils/logger.js'

// Mock dependencies
vi.mock('../../src/utils/datasetteQueries/fetchDatasetsFromProvisions.js', () => ({
  default: vi.fn()
}))

vi.mock('../../src/utils/datasetSlugToReadableName.js', () => ({
  datasetSlugToReadableName: vi.fn()
}))

vi.mock('../../src/utils/datasetteQueries/fetchDatasetCollections.js', () => ({
  getDatasetCollectionSlugNameMapping: vi.fn()
}))

vi.mock('../../src/utils/datasetLoader.js', () => ({
  getRedisClient: vi.fn()
}))

vi.mock('../../src/utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

vi.mock('../../config/index.js', () => ({
  default: {
    datasetsConfig: {
      'article-4-direction': {},
      'conservation-area': {},
      tree: {}
    }
  }
}))

describe('datasetSubjectLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('makeDatasetSubjectMap', () => {
    it('should create a subject map from name mapping and collection mapping', async () => {
      const nameMap = {
        'article-4-direction': 'Article 4 direction',
        'conservation-area': 'Conservation area',
        tree: 'Tree'
      }

      const mockCollectionMapping = new Map([
        ['article-4-direction', 'article-4-direction'],
        ['conservation-area', 'conservation-area'],
        ['tree', 'tree-preservation-order']
      ])

      getDatasetCollectionSlugNameMapping.mockResolvedValue(mockCollectionMapping)

      const result = await makeDatasetSubjectMap(nameMap)

      expect(result).toEqual({
        'article-4-direction': {
          available: true,
          dataSets: [{
            value: 'article-4-direction',
            text: 'Article 4 direction',
            available: true
          }]
        },
        'conservation-area': {
          available: true,
          dataSets: [{
            value: 'conservation-area',
            text: 'Conservation area',
            available: true
          }]
        },
        'tree-preservation-order': {
          available: true,
          dataSets: [{
            value: 'tree',
            text: 'Tree',
            available: true,
            requiresGeometryTypeSelection: true
          }]
        }
      })
    })

    it('should handle datasets with empty collection mapping (assigned to "other")', async () => {
      const nameMap = {
        'unknown-dataset': 'Unknown Dataset'
      }

      const mockCollectionMapping = new Map([
        ['unknown-dataset', ''] // Empty collection maps to 'other'
      ])

      getDatasetCollectionSlugNameMapping.mockResolvedValue(mockCollectionMapping)

      const result = await makeDatasetSubjectMap(nameMap)

      expect(result).toEqual({
        other: {
          available: true,
          dataSets: [{
            value: 'unknown-dataset',
            text: 'Unknown Dataset',
            available: true
          }]
        }
      })
    })

    it('should skip datasets with NO collection mapping (that has been removed in fetchDatasetCollection.js from the nameMap due to no database existing for the dataset)', async () => {
      const nameMap = {
        'mapped-dataset': 'Mapped Dataset',
        'unmapped-dataset': 'Unmapped Dataset'
      }

      const mockCollectionMapping = new Map([
        ['mapped-dataset', 'some-collection']
        // unmapped-dataset is not in the mapping
      ])

      getDatasetCollectionSlugNameMapping.mockResolvedValue(mockCollectionMapping)

      const result = await makeDatasetSubjectMap(nameMap)

      expect(result).toEqual({
        'some-collection': {
          available: true,
          dataSets: [{
            value: 'mapped-dataset',
            text: 'Mapped Dataset',
            available: true
          }]
        }
      })

      // unmapped-dataset should not appear in the result
      expect(Object.keys(result)).not.toContain('unmapped-dataset')
    })

    it('should return fallback data when collection mapping fails', async () => {
      const nameMap = { 'test-dataset': 'Test Dataset' }

      getDatasetCollectionSlugNameMapping.mockResolvedValue(null)

      const result = await makeDatasetSubjectMap(nameMap)

      expect(logger.warn).toHaveBeenCalledWith('Failed to fetch dataset collection mapping, using fallback')
      expect(result).toHaveProperty('article-4-direction')
      expect(result).toHaveProperty('brownfield-land')
      expect(result).toHaveProperty('conservation-area')
    })
  })

  describe('buildDataSubjects', () => {
    it('should build data subjects from provisions and create name mapping', async () => {
      fetchDatasetsFromProvisions.mockResolvedValue(['article-4-direction', 'tree'])
      datasetSlugToReadableName.mockImplementation((slug) => {
        const names = {
          'article-4-direction': 'Article 4 direction',
          tree: 'Tree'
        }
        return names[slug] || slug
      })

      const mockCollectionMapping = new Map([
        ['article-4-direction', 'article-4-direction'],
        ['tree', 'tree-preservation-order']
      ])
      getDatasetCollectionSlugNameMapping.mockResolvedValue(mockCollectionMapping)

      const result = await buildDataSubjects()

      expect(fetchDatasetsFromProvisions).toHaveBeenCalled()
      expect(datasetSlugToReadableName).toHaveBeenCalledWith('article-4-direction')
      expect(datasetSlugToReadableName).toHaveBeenCalledWith('tree')

      expect(result).toHaveProperty('article-4-direction')
      expect(result).toHaveProperty('tree-preservation-order')
      expect(result['tree-preservation-order'].dataSets[0]).toHaveProperty('requiresGeometryTypeSelection', true)
    })

    it('should fallback to config datasets when provisions fetch fails', async () => {
      fetchDatasetsFromProvisions.mockRejectedValue(new Error('Provisions fetch failed'))
      datasetSlugToReadableName.mockImplementation((slug) => slug.replace(/-/g, ' '))

      const mockCollectionMapping = new Map([
        ['article-4-direction', 'article-4-direction'],
        ['conservation-area', 'conservation-area'],
        ['tree', 'tree-preservation-order']
      ])
      getDatasetCollectionSlugNameMapping.mockResolvedValue(mockCollectionMapping)

      await buildDataSubjects()

      expect(logger.warn).toHaveBeenCalledWith('buildDataSubjects: Error fetching dataset keys roll back to defaults')
      expect(datasetSlugToReadableName).toHaveBeenCalledWith('article-4-direction')
      expect(datasetSlugToReadableName).toHaveBeenCalledWith('conservation-area')
      expect(datasetSlugToReadableName).toHaveBeenCalledWith('tree')
    })
  })

  describe('getDataSubjectMap', () => {
    let mockRedisClient

    beforeEach(() => {
      mockRedisClient = {
        get: vi.fn(),
        setEx: vi.fn()
      }
    })

    it('should return cached data when available in Redis', async () => {
      const cachedData = {
        'test-subject': {
          available: true,
          dataSets: [{ value: 'test', text: 'Test', available: true }]
        }
      }

      getRedisClient.mockResolvedValue(mockRedisClient)
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData))

      const result = await getDataSubjectMap()

      expect(mockRedisClient.get).toHaveBeenCalledWith('dataset:dataSubjectMap')
      expect(result).toEqual(cachedData)
      expect(fetchDatasetsFromProvisions).not.toHaveBeenCalled()
    })

    it('should fetch fresh data and cache it when Redis cache is empty', async () => {
      getRedisClient.mockResolvedValue(mockRedisClient)
      mockRedisClient.get.mockResolvedValue(null) // No cached data

      // Mock the buildDataSubjects flow
      fetchDatasetsFromProvisions.mockResolvedValue(['article-4-direction'])
      datasetSlugToReadableName.mockReturnValue('Article 4 direction')
      getDatasetCollectionSlugNameMapping.mockResolvedValue(new Map([['article-4-direction', 'article-4-direction']]))

      const result = await getDataSubjectMap()

      expect(mockRedisClient.get).toHaveBeenCalledWith('dataset:dataSubjectMap')
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'dataset:dataSubjectMap',
        60 * 60, // 1 hours TTL
        JSON.stringify(result)
      )
      expect(result).toHaveProperty('article-4-direction')
    })

    it('should work without Redis when client is not available', async () => {
      getRedisClient.mockResolvedValue(null) // No Redis client

      // Mock the buildDataSubjects flow
      fetchDatasetsFromProvisions.mockResolvedValue(['conservation-area'])
      datasetSlugToReadableName.mockReturnValue('Conservation area')
      getDatasetCollectionSlugNameMapping.mockResolvedValue(new Map([['conservation-area', 'conservation-area']]))

      const result = await getDataSubjectMap()

      expect(result).toHaveProperty('conservation-area')
      expect(mockRedisClient.get).not.toHaveBeenCalled()
      expect(mockRedisClient.setEx).not.toHaveBeenCalled()
    })

    it('should handle Redis errors gracefully and continue with fresh data', async () => {
      getRedisClient.mockResolvedValue(mockRedisClient)
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'))
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis set error'))

      // Mock the buildDataSubjects flow
      fetchDatasetsFromProvisions.mockResolvedValue(['tree'])
      datasetSlugToReadableName.mockReturnValue('Tree')
      getDatasetCollectionSlugNameMapping.mockResolvedValue(new Map([['tree', 'tree-preservation-order']]))

      const result = await getDataSubjectMap()

      expect(logger.warn).toHaveBeenCalledWith('datasetSubjectLoader/redis get error: Redis connection error')
      expect(logger.warn).toHaveBeenCalledWith('datasetSubjectLoader/redis set error: Redis set error')
      expect(result).toHaveProperty('tree-preservation-order')
    })

    it('should handle JSON parse errors from cached data', async () => {
      getRedisClient.mockResolvedValue(mockRedisClient)
      mockRedisClient.get.mockResolvedValue('invalid-json')

      // Mock the buildDataSubjects flow for fallback
      fetchDatasetsFromProvisions.mockResolvedValue(['article-4-direction'])
      datasetSlugToReadableName.mockReturnValue('Article 4 direction')
      getDatasetCollectionSlugNameMapping.mockResolvedValue(new Map([['article-4-direction', 'article-4-direction']]))

      const result = await getDataSubjectMap()

      expect(result).toHaveProperty('article-4-direction')
    })
  })
})
