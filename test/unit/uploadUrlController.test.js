import { describe, it, expect, vi, beforeEach } from 'vitest'

import UploadUrlController from '../../src/controllers/uploadUrlController.js'

describe('UploadUrlController', async () => {
  vi.mock('@/utils/publishRequestAPI.js')

  let uploadUrlController
  let publishRequestApi

  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ id: '1234' })
    })
  )

  beforeEach(async () => {
    publishRequestApi = await import('@/utils/publishRequestAPI')
    publishRequestApi.postUrlRequest = vi.fn()

    uploadUrlController = new UploadUrlController({
      route: '/url'
    })
  })

  describe('post', () => {
    it('should call publishRequestApi.postRequest with the correct data', async () => {
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

      await uploadUrlController.post(req, res, next)

      expect(publishRequestApi.postUrlRequest).toHaveBeenCalledWith({
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

      await uploadUrlController.post(req, res, next)

      expect(publishRequestApi.postUrlRequest).not.toHaveBeenCalled()
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

      await uploadUrlController.post(req, res, next)

      expect(publishRequestApi.postUrlRequest).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })
  })

  describe('validators', () => {
    describe('localUrlValidation', () => {
      it('should return true for valid and not too long URLs', () => {
        const url = 'http://example.com'
        expect(UploadUrlController.localUrlValidation(url)).toBe(true)
      })

      it('should return false for invalid URLs', () => {
        const url = 'invalid-url'
        expect(UploadUrlController.localUrlValidation(url)).toBe(false)
      })

      it('should return false for too long URLs', () => {
        let url = 'http://example.com/'
        url += 'a'.repeat(2048)
        expect(UploadUrlController.localUrlValidation(url)).toBe(false)
      })
    })

    describe('urlIsValid', () => {
      it('should return true for valid URLs', () => {
        const url = 'http://example.com'
        expect(UploadUrlController.urlIsValid(url)).toBe(true)
      })

      it('should return false for invalid URLs', () => {
        const url = 'invalid-url'
        expect(UploadUrlController.urlIsValid(url)).toBe(false)
      })
    })

    describe('urlIsNotTooLong', () => {
      it('should return true for URLs not longer than 2048 characters', () => {
        const url = 'http://example.com'
        expect(UploadUrlController.urlIsNotTooLong(url)).toBe(true)
      })

      it('should return false for URLs longer than 2048 characters', () => {
        let url = 'http://example.com/'
        url += 'a'.repeat(2048)
        expect(UploadUrlController.urlIsNotTooLong(url)).toBe(false)
      })
    })
  })
})
