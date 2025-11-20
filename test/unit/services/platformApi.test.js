import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import platformApi from '../../../src/services/platformApi.js'

vi.mock('axios')
vi.mock('../../../config/index.js', () => ({
  default: {
    mainWebsiteUrl: 'https://www.planning.data.gov.uk'
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
      'https://www.planning.data.gov.uk/entity.json?organisation_entity=12345&dataset=conservation-area&limit=10&offset=50'
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
      'https://www.planning.data.gov.uk/entity.json?organisation_entity=67890&dataset=article-4-direction'
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
      'https://www.planning.data.gov.uk/entity.json?organisation_entity=55555&dataset=article-4-direction&limit=50&offset=50'
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
