import { describe, it, expect, vi, beforeEach } from 'vitest'

import SubmitUrlController from '../../src/controllers/submitUrlController.js'

describe('SubmitUrlController', async () => {
  vi.mock('@/utils/asyncRequestApi.js')

  let submitUrlController
  let asyncRequestApi

  beforeEach(async () => {
    asyncRequestApi = await import('@/utils/asyncRequestApi')
    asyncRequestApi.postUrlRequest = vi.fn()

    submitUrlController = new SubmitUrlController({
      route: '/url'
    })
  })

  describe('post', () => {
    it('should call asyncRequestApi.postRequest with the correct data', async () => {
      const req = {
        body: {
          url: 'http://example.com'
        },
        sessionModel: {
          get: vi.fn()
        },
        session: {
          id: '1234'
        }
      }
      const res = {}
      const next = vi.fn()

      await submitUrlController.post(req, res, next)

      expect(asyncRequestApi.postUrlRequest).toHaveBeenCalledWith({
        url: 'http://example.com',
        sessionId: '1234',
        dataset: undefined,
        dataSubject: undefined,
        geomType: undefined
      })
    })

    it('should call next if the URL is invalid', async () => {
      const req = {
        body: {
          url: 'invalid-url'
        },
        sessionModel: {
          get: vi.fn()
        },
        session: {
          id: '1234'
        }
      }
      const res = {}
      const next = vi.fn()

      await submitUrlController.post(req, res, next)

      expect(asyncRequestApi.postUrlRequest).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('should call next if the URL is too long', async () => {
      const req = {
        body: {
          url: 'http://example.com/' + 'a'.repeat(2048)
        },
        sessionModel: {
          get: vi.fn()
        },
        session: {
          id: '1234'
        }
      }
      const res = {}
      const next = vi.fn()

      await submitUrlController.post(req, res, next)

      expect(asyncRequestApi.postUrlRequest).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })
  })

  describe('validators', () => {
    describe('localUrlValidation', () => {
      it('should return true for valid and not too long URLs', () => {
        const url = 'http://example.com'
        expect(SubmitUrlController.localUrlValidation(url)).toBe(true)
      })

      it('should return false for invalid URLs', () => {
        const url = 'invalid-url'
        expect(SubmitUrlController.localUrlValidation(url)).toBe(false)
      })

      it('should return false for too long URLs', () => {
        let url = 'http://example.com/'
        url += 'a'.repeat(2048)
        expect(SubmitUrlController.localUrlValidation(url)).toBe(false)
      })
    })

    describe('urlIsValid', () => {
      it('should return true for valid URLs', () => {
        const url = 'http://example.com'
        expect(SubmitUrlController.urlIsValid(url)).toBe(true)
      })

      it('should return false for invalid URLs', () => {
        const url = 'invalid-url'
        expect(SubmitUrlController.urlIsValid(url)).toBe(false)
      })
    })

    describe('urlIsNotTooLong', () => {
      it('should return true for URLs not longer than 2048 characters', () => {
        const url = 'http://example.com'
        expect(SubmitUrlController.urlIsNotTooLong(url)).toBe(true)
      })

      it('should return false for URLs longer than 2048 characters', () => {
        let url = 'http://example.com/'
        url += 'a'.repeat(2048)
        expect(SubmitUrlController.urlIsNotTooLong(url)).toBe(false)
      })
    })
  })
})
