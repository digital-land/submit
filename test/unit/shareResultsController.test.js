import { describe, it, expect, vi, beforeEach } from 'vitest'
import ShareResultsController from '../../src/controllers/ShareResultsController.js'
import PageController from '../../src/controllers/pageController.js'
import config from '../../config/index.js'

describe('ShareResultsController', () => {
  let shareResultsController
  let req
  let res
  let next

  beforeEach(() => {
    shareResultsController = new ShareResultsController({
      route: '/share'
    })

    req = {
      params: { id: '123' },
      locals: {},
      form: { options: {} }
    }

    res = {}
    next = vi.fn()
  })

  it('should extend PageController', () => {
    expect(shareResultsController).toBeInstanceOf(PageController)
  })

  describe('locals', () => {
    it('should set shareLink in req.locals and req.form.options', async () => {
      await shareResultsController.locals(req, res, next)

      const expectedLink = `${config.url}check/results/123/1`
      expect(req.locals.shareLink).toBe(expectedLink)
      expect(req.form.options.shareLink).toBe(expectedLink)
    })

    it('should set backLink and backLinkText in options', async () => {
      await shareResultsController.locals(req, res, next)

      const expectedLink = `${config.url}check/results/123/1`
      expect(shareResultsController.options.backLink).toBe(expectedLink)
      expect(shareResultsController.options.backLinkText).toBe('Back to results')
    })

    it('should call super.locals', async () => {
      const superLocalsSpy = vi.spyOn(PageController.prototype, 'locals')

      await shareResultsController.locals(req, res, next)

      expect(superLocalsSpy).toHaveBeenCalledWith(req, res, next)
    })

    it('should handle errors and pass them to next', async () => {
      const error = new Error('Test error')
      vi.spyOn(PageController.prototype, 'locals').mockImplementation(() => {
        throw error
      })

      await shareResultsController.locals(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('generateResultsLink', () => {
    it('should generate correct results link', () => {
      const link = shareResultsController.generateResultsLink('456')
      expect(link).toBe(`${config.url}check/results/456/1`)
    })

    it('should handle different id formats', () => {
      const testCases = ['abc123', '789-xyz', 'test_id']

      testCases.forEach(id => {
        const link = shareResultsController.generateResultsLink(id)
        expect(link).toBe(`${config.url}check/results/${id}/1`)
      })
    })
  })
})
