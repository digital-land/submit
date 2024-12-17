// osMapService.test.js
import { getOsMapAccessToken } from '../../../src/services/osMapService'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the global fetch API
global.fetch = vi.fn()

describe('getOsMapAccessToken', () => {
  const mockTokenResponse = { access_token: 'mock-token', expires_in: '299', issued_at: Date.now(), token_type: 'Bearer' }
  const API_URL = 'https://planning.data.gov.uk/os/getToken'

  beforeEach(() => {
    vi.clearAllMocks() // Clear mock calls before each test
  })

  it('should fetch the OS Map Access Token successfully', async () => {
    fetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce(mockTokenResponse)
    })

    const token = await getOsMapAccessToken()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(API_URL)
    expect(token).toEqual(mockTokenResponse)
  })

  it('should throw an error if fetch fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(getOsMapAccessToken()).rejects.toThrow('Network error')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(API_URL)
  })

  it('should throw an error if JSON parsing fails', async () => {
    fetch.mockResolvedValueOnce({
      json: vi.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
    })

    await expect(getOsMapAccessToken()).rejects.toThrow('Invalid JSON')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(API_URL)
  })
})
