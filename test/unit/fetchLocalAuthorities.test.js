import axios from 'axios'
import { vi, it, describe, expect } from 'vitest'
import { fetchLocalAuthorities } from '../../src/utils/fetchLocalAuthorities'

// Mock axios.get to return a fake response
vi.mock('axios')
axios.get.mockResolvedValue({
  data: {
    rows: [
      [1, 'Local Authority 1'],
      [2, 'Local Authority 2'],
      [3, 'Local Authority 3']
    ]
  }
})

describe('fetchLocalAuthorities', () => {
  it('should fetch local authority names', async () => {
    const result = await fetchLocalAuthorities()
    expect(result).toEqual(['Local Authority 1', 'Local Authority 2', 'Local Authority 3'])
  })

  it('should throw an error if the HTTP request fails', async () => {
    axios.get.mockRejectedValue(new Error('Failed to fetch data'))
    await expect(fetchLocalAuthorities()).rejects.toThrow('Failed to fetch data')
  })

  it('should throw an error if data processing encounters an issue', async () => {
    axios.get.mockResolvedValue({
      data: {
        rows: [
          [1, 'Local Authority 1'],
          [2, null], // Simulate null value in the response
          [3, 'Local Authority 3']
        ]
      }
    })
    const result = await fetchLocalAuthorities()
    expect(result).toEqual(['Local Authority 1', 'Local Authority 3'])
  })
})
