import { describe, it, expect, vi, beforeEach } from 'vitest'

import UploadUrlController from '../../src/controllers/uploadUrlController.js'

import publishRequestApi from '../../src/utils/publishRequestAPI.js'

describe('UploadUrlController', () => {
  let uploadUrlController

  beforeEach(() => {
    vi.spyOn(publishRequestApi, 'postFileRequest')

    vi.mock('../../src/utils/publishRequestAPI.js', () => ({
      postFileRequest: vi.fn().mockResolvedValue('requestId')
    }))

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '1234' })
      })
    )
  })

  describe('post', () => {
    it('should call publishRequestApi.postRequest with the correct data', async () => {
      const req = {
        body: {
          url: 'http://example.com'
        }
      }
      const res = {}
      const next = vi.fn()

      uploadUrlController = new UploadUrlController()
      await uploadUrlController.post(req, res, next)

      expect(publishRequestApi.postRequest).toHaveBeenCalledWith({
        url: 'http://example.com'
      })
    })

    it('should call next if the URL is invalid', async () => {
      const req = {
        body: {
          url: 'invalid-url'
        }
      }
      const res = {}
      const next = vi.fn()

      uploadUrlController = new UploadUrlController()
      await uploadUrlController.post(req, res, next)

      expect(publishRequestApi.postRequest).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('should call next if the URL is too long', async () => {
      const req = {
        body: {
          url: 'http://example.com/' + 'a'.repeat(2048)
        }
      }
      const res = {}
      const next = vi.fn()

      uploadUrlController = new UploadUrlController()
      await uploadUrlController.post(req, res, next)

      expect(publishRequestApi.postRequest).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('should call next if there is an error', async () => {
      const req = {
        body: {
          url: 'http://example.com'
        }
      }
      const res = {}
      const next = vi.fn()

      vi.mock('../../src/utils/publishRequestAPI.js', () => ({
        postRequest: vi.fn().mockRejectedValue(new Error('test error'))
      }))

      uploadUrlController = new UploadUrlController()
      await uploadUrlController.post(req, res, next)

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
