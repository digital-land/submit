import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getApiToken, getFreshApiToken } from '../../../src/assets/js/os-api-token.js'

global.fetch = vi.fn()

const mockToken = {
  access_token: 'mock-api-token',
  expires_in: '299',
  issued_at: Date.now(),
  token_type: 'Bearer'
}

describe('os-api-token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getFreshApiToken', () => {
    it('should fetch a new token and resolve with access_token', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => mockToken
      })

      const token = await getFreshApiToken()
      expect(fetch).toHaveBeenCalledWith('/api/os/get-access-token')
      expect(token).toBe(mockToken.access_token)
    })

    it('should handle fetch errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network Error'))

      await expect(getFreshApiToken()).rejects.toThrow('Network Error')
      expect(fetch).toHaveBeenCalledWith('/api/os/get-access-token')
    })
  })

  describe('getApiToken', () => {
    it('should return the existing token if not expired', () => {
      mockToken.issued_at = Date.now()
      mockToken.expires_in = 60 // 1 minute

      const token = getApiToken()
      expect(token).toBe(mockToken.access_token)
    })

    it('should fetch a fresh token if the existing token is expired', async () => {
      mockToken.issued_at = Date.now() - 120 * 1000 // 2 minutes ago
      mockToken.expires_in = 60 // 1 minute

      fetch.mockResolvedValueOnce({
        json: async () => mockToken
      })

      const token = await getApiToken()
      expect(fetch).toHaveBeenCalledWith('/api/os/get-access-token')
      expect(token).toBe(mockToken.access_token)
    })

    it('should not make multiple requests if a token refresh is already in progress', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => mockToken
      })

      const promise1 = getApiToken()
      const promise2 = getApiToken()

      await Promise.all([promise1, promise2])

      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })
})
