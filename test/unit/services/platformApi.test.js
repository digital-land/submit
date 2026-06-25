import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import platformApi from '../../../src/services/platformApi.js'

vi.mock('axios')
vi.mock('../../../config/index.js', () => ({
  default: {
    mainWebsiteUrl: 'https://www.planning.data.gov.uk',
    checkService: {
      userAgentInternal: 'test-user-agent'
    }
  }
}))

describe('platformApi.fetchEntities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch entities with all parameters', async () => {
    const mockResponse = {
      data: {
        entities: [
          { entity: '123', name: 'Entity 1', dataset: 'conservation-area' },
          { entity: '456', name: 'Entity 2', dataset: 'conservation-area' }
        ],
        count: 2
      }
    }

    axios.get.mockResolvedValueOnce(mockResponse)

    const params = {
      organisation_entity: '12345',
      dataset: 'conservation-area',
      limit: 10,
      offset: 50
    }

    const result = await platformApi.fetchEntities(params)

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get).toHaveBeenCalledWith(
      'https://www.planning.data.gov.uk/entity.json?organisation_entity=12345&dataset=conservation-area&limit=10&offset=50',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'test-user-agent'
        }
      }
    )
    expect(result).toEqual({
      data: mockResponse.data,
      formattedData: mockResponse.data.entities
    })
  })

  it('should fetch entities with only required parameters', async () => {
    const mockResponse = {
      data: {
        entities: [
          { entity: '789', name: 'Entity 3', dataset: 'article-4-direction' }
        ]
      }
    }

    axios.get.mockResolvedValueOnce(mockResponse)

    const params = {
      organisation_entity: '67890',
      dataset: 'article-4-direction'
    }

    const result = await platformApi.fetchEntities(params)

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get).toHaveBeenCalledWith(
      'https://www.planning.data.gov.uk/entity.json?organisation_entity=67890&dataset=article-4-direction',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'test-user-agent'
        }
      }
    )
    expect(result).toEqual({
      data: mockResponse.data,
      formattedData: mockResponse.data.entities
    })
  })

  it('should handle empty entities response', async () => {
    const mockResponse = {
      data: {
        entities: []
      }
    }

    axios.get.mockResolvedValueOnce(mockResponse)

    const params = {
      organisation_entity: '11111',
      dataset: 'conservation-area'
    }

    const result = await platformApi.fetchEntities(params)

    expect(result).toEqual({
      data: mockResponse.data,
      formattedData: []
    })
  })

  it('should handle response with missing entities field', async () => {
    const mockResponse = {
      data: {}
    }

    axios.get.mockResolvedValueOnce(mockResponse)

    const params = {
      organisation_entity: '22222',
      dataset: 'conservation-area'
    }

    const result = await platformApi.fetchEntities(params)

    expect(result).toEqual({
      data: mockResponse.data,
      formattedData: []
    })
  })

  it('should handle pagination with limit and offset', async () => {
    const mockResponse = {
      data: {
        entities: [
          { entity: '333', name: 'Entity Page 2 Item 1' },
          { entity: '444', name: 'Entity Page 2 Item 2' }
        ]
      }
    }

    axios.get.mockResolvedValueOnce(mockResponse)

    const params = {
      organisation_entity: '55555',
      dataset: 'article-4-direction',
      limit: 50,
      offset: 50
    }

    const result = await platformApi.fetchEntities(params)

    expect(axios.get).toHaveBeenCalledWith(
      'https://www.planning.data.gov.uk/entity.json?organisation_entity=55555&dataset=article-4-direction&limit=50&offset=50',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'test-user-agent'
        }
      }
    )
    expect(result.formattedData).toHaveLength(2)
  })

  it('should throw error when API request fails', async () => {
    const mockError = new Error('Network Error')
    axios.get.mockRejectedValueOnce(mockError)

    const params = {
      organisation_entity: '33333',
      dataset: 'conservation-area'
    }

    await expect(platformApi.fetchEntities(params)).rejects.toThrow('Network Error')
  })
})

describe('platformApi.fetchTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds the correct URL with dataset filter', async () => {
    axios.get.mockResolvedValueOnce({ data: { tasks: [], count: 0 } })

    await platformApi.fetchTasks({
      organisation: 'local-authority:TST',
      dataset: 'brownfield-land',
      severity: 'error',
      task_source: 'issue',
      limit: 100
    })

    expect(axios.get).toHaveBeenCalledWith(
      'https://www.planning.data.gov.uk/task.json?organisation=local-authority%3ATST&dataset=brownfield-land&severity=error&task_source=issue&limit=100',
      expect.any(Object)
    )
  })

  it('omits dataset param when not provided', async () => {
    axios.get.mockResolvedValueOnce({ data: { tasks: [], count: 0 } })

    await platformApi.fetchTasks({
      organisation: 'local-authority:TST',
      severity: 'error',
      task_source: 'issue',
      limit: 500
    })

    const calledUrl = axios.get.mock.calls[0][0]
    expect(calledUrl).not.toContain('dataset=')
    expect(calledUrl).toContain('limit=500')
  })

  it('returns formattedData with tasks and count', async () => {
    const tasks = [{ reference: 'abc', dataset: 'brownfield-land', details: { issue_type: 'missing value', field: 'name', count: 1 } }]
    axios.get.mockResolvedValueOnce({ data: { tasks, count: 1 } })

    const result = await platformApi.fetchTasks({ organisation: 'local-authority:TST' })

    expect(result.formattedData).toEqual({ tasks, count: 1 })
  })

  it('returns empty formattedData when response is missing fields', async () => {
    axios.get.mockResolvedValueOnce({ data: {} })

    const result = await platformApi.fetchTasks({ organisation: 'local-authority:TST' })

    expect(result.formattedData).toEqual({ tasks: [], count: 0 })
  })
})
