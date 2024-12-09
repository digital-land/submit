import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'
import { getBoundaryForLpa } from '../../../src/services/boundaryService.js'
import config from '../../../config/index.js'

vi.mock('axios')

describe('getBoundaryForLpa', () => {
  const boundaryId = 'dataset1:lpa1'
  const invalidBoundaryId = 'invalidBoundaryId'
  const entityResponse = {
    data: {
      entities: [
        { 'local-planning-authority': 'lpa1' }
      ]
    }
  }
  const boundaryResponse = {
    data: { type: 'FeatureCollection', features: [] }
  }

  it('should return boundary data for valid boundary ID', async () => {
    axios.get.mockResolvedValueOnce(entityResponse)
    axios.get.mockResolvedValueOnce(boundaryResponse)

    const result = await getBoundaryForLpa(boundaryId)

    expect(result).toEqual(boundaryResponse.data)
    expect(axios.get).toHaveBeenCalledWith(`${config.mainWebsiteUrl}/entity.json?dataset=dataset1&reference=lpa1`)
    expect(axios.get).toHaveBeenCalledWith(`${config.mainWebsiteUrl}/entity.geojson?reference=lpa1`)
  })

  it('should return error for invalid boundary ID format', async () => {
    const result = await getBoundaryForLpa(invalidBoundaryId)

    expect(result).toEqual({ error: 'Invalid boundary ID' })
  })

  it('should return error if no entity found', async () => {
    axios.get.mockResolvedValueOnce({ data: { entities: [] } })

    const result = await getBoundaryForLpa(boundaryId)

    expect(result).toEqual({ error: 'Failed to get boundary data for dataset1:lpa1. Please ensure you are sending the correct parameters.' })
    expect(axios.get).toHaveBeenCalledWith(`${config.mainWebsiteUrl}/entity.json?dataset=dataset1&reference=lpa1`)
  })

  it('should return error if no local planning authority found', async () => {
    axios.get.mockResolvedValueOnce({ data: { entities: [{}] } })

    const result = await getBoundaryForLpa(boundaryId)

    expect(result).toEqual({ error: 'Failed to get boundary data for dataset1:lpa1. Please ensure you are sending the correct parameters.' })
    expect(axios.get).toHaveBeenCalledWith(`${config.mainWebsiteUrl}/entity.json?dataset=dataset1&reference=lpa1`)
  })

  it('should return error if failed to get boundary data', async () => {
    axios.get.mockResolvedValueOnce(entityResponse)
    axios.get.mockRejectedValueOnce(new Error('Network Error'))

    const result = await getBoundaryForLpa(boundaryId)

    expect(result).toEqual({ error: 'Failed to get boundary data: Error undefined: Service temporarily unavailable' })
    expect(axios.get).toHaveBeenCalledWith(`${config.mainWebsiteUrl}/entity.json?dataset=dataset1&reference=lpa1`)
    expect(axios.get).toHaveBeenCalledWith(`${config.mainWebsiteUrl}/entity.geojson?reference=lpa1`)
  })
})
