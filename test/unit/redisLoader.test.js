import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { getDatasetNameMap, normaliseDatasetFields } from '../../src/utils/redisLoader'
import config from '../../config'

describe('getDatasetNameMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch datasets and return a mapping of dataset -> name', async () => {
    const mockApiData = {
      datasets: [
        { dataset: 'ancient-woodland', name: 'Ancient woodland' },
        { dataset: 'article-4-direction-area', name: 'Article 4 direction area' }
      ]
    }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData
    })

    const datasetKeys = ['ancient-woodland', 'article-4-direction-area']
    const result = await getDatasetNameMap(datasetKeys)
    expect(fetch).toHaveBeenCalledWith(
      `${config.mainWebsiteUrl}/dataset.json?dataset=ancient-woodland&dataset=article-4-direction-area&field=dataset&field=name&include_typologies=false`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'user-agent': 'Planning Data Provide'
        })
      })
    )
    expect(result).toEqual({
      'ancient-woodland': 'Ancient woodland',
      'article-4-direction-area': 'Article 4 direction area'
    })
  })
  it('should throw an error if the fetch fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found'
    })
    await expect(getDatasetNameMap(['ancient-woodland'])).rejects.toThrow('Failed to fetch datasets from API: Not Found')
  })

  it('should namespace cache keys by deployment', async () => {
    const originalDeployTime = process.env.DEPLOY_TIME
    const originalGitCommit = process.env.GIT_COMMIT
    const mockRedisClient = {
      isOpen: false,
      connect: vi.fn().mockImplementation(async () => {
        mockRedisClient.isOpen = true
      }),
      get: vi.fn().mockResolvedValue(null),
      setEx: vi.fn().mockResolvedValue()
    }

    try {
      process.env.DEPLOY_TIME = 'deploy-123'
      process.env.GIT_COMMIT = 'commit-abc'

      vi.resetModules()
      vi.doMock('redis', () => ({
        createClient: vi.fn(() => mockRedisClient)
      }))
      vi.doMock('../../config/index.js', () => ({
        default: {
          redis: {
            secure: false,
            host: 'localhost',
            port: 6379
          },
          mainWebsiteUrl: config.mainWebsiteUrl
        }
      }))

      const { getDatasetNameMap: getDatasetNameMapWithDeploy } = await import('../../src/utils/redisLoader.js')

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          datasets: [{ dataset: 'example-dataset', name: 'Example dataset' }]
        })
      })

      await getDatasetNameMapWithDeploy(['example-dataset'])

      expect(mockRedisClient.get).toHaveBeenCalledWith('deploy-123:dataset:example-dataset')
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'deploy-123:dataset:example-dataset',
        300,
        JSON.stringify({ 'example-dataset': 'Example dataset' })
      )
    } finally {
      process.env.DEPLOY_TIME = originalDeployTime
      process.env.GIT_COMMIT = originalGitCommit
      vi.unmock('redis')
      vi.unmock('../../config/index.js')
      vi.resetModules()
    }
  })

  it('should fetch dataset fields and provision reasons with namespaced cache keys', async () => {
    const originalDeployTime = process.env.DEPLOY_TIME
    const mockRedisClient = {
      isOpen: false,
      connect: vi.fn().mockImplementation(async () => {
        mockRedisClient.isOpen = true
      }),
      get: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(['statutory'])),
      setEx: vi.fn().mockResolvedValue()
    }
    const mockDatasette = {
      default: {
        runQuery: vi.fn()
          .mockResolvedValueOnce({
            formattedData: [
              { field: 'reference' },
              { field: 'organisation' },
              { field: 'notes' },
              { field: 'entity' },
              { field: 'name' }
            ]
          })
          .mockResolvedValueOnce({
            formattedData: [{ provision_reason: 'statutory' }]
          })
      }
    }

    try {
      process.env.DEPLOY_TIME = 'deploy-456'

      vi.resetModules()
      vi.doMock('redis', () => ({
        createClient: vi.fn(() => mockRedisClient)
      }))
      vi.doMock('../../config/index.js', () => ({
        default: {
          redis: {
            secure: false,
            host: 'localhost',
            port: 6379
          },
          mainWebsiteUrl: config.mainWebsiteUrl
        }
      }))
      vi.doMock('../../src/services/datasette.js', () => mockDatasette)

      const {
        getDatasetFields,
        getProvisionReasonsForDataset,
        isStatutoryDataset
      } = await import('../../src/utils/redisLoader.js')

      await expect(getDatasetFields('conservation-area')).resolves.toEqual(['name', 'notes', 'reference'])
      await expect(getProvisionReasonsForDataset({
        organisation: 'local-authority:TST',
        dataset: 'conservation-area'
      })).resolves.toEqual(['statutory'])
      await expect(isStatutoryDataset({
        organisation: 'local-authority:TST',
        dataset: 'conservation-area'
      })).resolves.toBe(true)

      expect(mockRedisClient.get).toHaveBeenNthCalledWith(1, 'deploy-456:dataset-fields:conservation-area')
      expect(mockRedisClient.setEx).toHaveBeenNthCalledWith(
        1,
        'deploy-456:dataset-fields:conservation-area',
        300,
        JSON.stringify(['name', 'notes', 'reference'])
      )
      expect(mockRedisClient.get).toHaveBeenNthCalledWith(2, 'deploy-456:provision-reasons:local-authority:TST:conservation-area')
      expect(mockRedisClient.setEx).toHaveBeenNthCalledWith(
        2,
        'deploy-456:provision-reasons:local-authority:TST:conservation-area',
        300,
        JSON.stringify(['statutory'])
      )
      expect(mockDatasette.default.runQuery).toHaveBeenCalledTimes(2)
    } finally {
      process.env.DEPLOY_TIME = originalDeployTime
      vi.unmock('redis')
      vi.unmock('../../config/index.js')
      vi.unmock('../../src/services/datasette.js')
      vi.resetModules()
    }
  })

  it('should return cached dataset fields and provision reasons without querying Datasette', async () => {
    const mockRedisClient = {
      isOpen: false,
      connect: vi.fn().mockImplementation(async () => {
        mockRedisClient.isOpen = true
      }),
      get: vi.fn()
        .mockResolvedValueOnce(JSON.stringify(['cached-field']))
        .mockResolvedValueOnce(JSON.stringify(['expected'])),
      setEx: vi.fn().mockResolvedValue()
    }
    const mockDatasette = {
      default: {
        runQuery: vi.fn()
      }
    }

    try {
      vi.resetModules()
      vi.doMock('redis', () => ({
        createClient: vi.fn(() => mockRedisClient)
      }))
      vi.doMock('../../config/index.js', () => ({
        default: {
          redis: {
            secure: false,
            host: 'localhost',
            port: 6379
          },
          mainWebsiteUrl: config.mainWebsiteUrl
        }
      }))
      vi.doMock('../../src/services/datasette.js', () => mockDatasette)

      const {
        getDatasetFields,
        getProvisionReasonsForDataset
      } = await import('../../src/utils/redisLoader.js')

      await expect(getDatasetFields('conservation-area')).resolves.toEqual(['cached-field'])
      await expect(getProvisionReasonsForDataset({
        organisation: 'local-authority:TST',
        dataset: 'conservation-area'
      })).resolves.toEqual(['expected'])
      expect(mockDatasette.default.runQuery).not.toHaveBeenCalled()
    } finally {
      vi.unmock('redis')
      vi.unmock('../../config/index.js')
      vi.unmock('../../src/services/datasette.js')
      vi.resetModules()
    }
  })

  it('should normalise duplicate, empty and system dataset fields', () => {
    expect(normaliseDatasetFields([
      { field: 'reference' },
      { field: 'reference' },
      { field: 'organisation' },
      { field: 'entity' },
      { field: '' },
      {}
    ])).toEqual(['reference'])
  })
})
