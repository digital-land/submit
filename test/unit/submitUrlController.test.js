import { describe, it, expect, vi, beforeEach } from 'vitest'

import SubmitUrlController from '../../src/controllers/submitUrlController.js'
import config from '../../config/index.js'

describe('SubmitUrlController', async () => {
  vi.mock('@/services/asyncRequestApi.js')

  let submitUrlController
  let asyncRequestApi

  const mocks = vi.hoisted(() => {
    return {
      headMock: vi.fn().mockImplementation(() => ({ headers: { 'content-length': '1', 'content-type': 'text/csv' }, status: 200 }))
    }
  })

  vi.mock('axios', () => {
    return {
      default: {
        head: mocks.headMock
      }
    }
  })

  beforeEach(async () => {
    asyncRequestApi = await import('@/services/asyncRequestApi')
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

    it('should trim any spaces in the URL', async () => {
      const req = {
        body: {
          url: '  http://example.com  '
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

  describe('getHeadRequest', () => {
    it('should return the response from axios.head', async () => {
      const response = { headers: { 'content-length': '1' } }
      mocks.headMock.mockImplementation(() => response)
      expect(await SubmitUrlController.headRequest('http://example.com')).toBe(response)
    })
  })

  describe('validators', () => {
    describe('localUrlValidation', () => {
      it('should return undefined for valid and not too long URLs', async () => {
        mocks.headMock.mockImplementation(() => ({ headers: { 'content-length': '1', 'content-type': 'text/csv' }, status: 200 }))
        const url = 'http://example.com'
        expect(await SubmitUrlController.localUrlValidation(url)).toBeUndefined()
      })

      it('should return the correct error for invalid URLs', async () => {
        mocks.headMock.mockImplementation(() => ({ headers: { 'content-length': '1', 'content-type': 'text/csv' }, status: 200 }))
        const url = 'invalid-url'
        expect(await SubmitUrlController.localUrlValidation(url)).toBe('format')
      })

      it('should return the correct error for too long URLs', async () => {
        mocks.headMock.mockImplementation(() => ({ headers: { 'content-length': '1', 'content-type': 'text/csv' }, status: 200 }))
        let url = 'http://example.com/'
        url += 'a'.repeat(2048)
        expect(await SubmitUrlController.localUrlValidation(url)).toBe('length')
      })

      it('should return null if the head request fails', async () => {
        mocks.headMock.mockImplementation(() => { throw new Error('Head request failed') })
        const url = 'http://example.com'
        expect(await SubmitUrlController.localUrlValidation(url)).toBeNull()
      })

      it('should return null if the head request method is not allowed', async () => {
        mocks.headMock.mockImplementation(() => ({ status: 405 }))
        const url = 'http://example.com'
        expect(await SubmitUrlController.localUrlValidation(url)).toBeNull()
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

    describe('urlSize', () => {
      it('should return true for URLs with a response smaller than max file size', async () => {
        expect(SubmitUrlController.urlResponseIsNotTooLarge({ headers: { 'content-length': '1' } })).toBe(true)
      })

      it('should return false for URLs with a response larger than the max file size', async () => {
        expect(SubmitUrlController.urlResponseIsNotTooLarge({ headers: { 'content-length': config.validations.maxFileSize + 21 } })).toBe(false)
      })

      it('should return true for URLs without a content length header', async () => {
        expect(SubmitUrlController.urlResponseIsNotTooLarge({ headers: { } })).toBe(true)
      })
    })

    describe('urlExists', () => {
      it('should return true for URLs that exist', async () => {
        expect(SubmitUrlController.isUrlAccessible({ status: 200 })).toBe(true)
      })

      it('should return true for URLs that exist with a 3XX status code', async () => {
        expect(SubmitUrlController.isUrlAccessible({ status: 301 })).toBe(true)
      })

      it('should return false for URLs that exist with a 4XX status code', async () => {
        expect(SubmitUrlController.isUrlAccessible({ status: 404 })).toBe(false)
      })

      it('should return false for URLs that do not exist', async () => {
        expect(SubmitUrlController.isUrlAccessible(null)).toBe(false)
      })
    })

    describe('validateAcceptedFileType', () => {
      it('should return true for accepted file types', async () => {
        expect(SubmitUrlController.validateAcceptedFileType({ headers: { 'content-type': 'text/csv' } })).toBe(true)
      })

      it('should return false for unaccepted file types', async () => {
        expect(SubmitUrlController.validateAcceptedFileType({ headers: { 'content-type': 'text/html' } })).toBe(false)
      })
    })
  })
})
