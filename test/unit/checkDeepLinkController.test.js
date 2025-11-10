import { describe, it, vi, expect, beforeEach } from 'vitest'
import CheckDeepLinkController from '../../src/controllers/checkDeepLinkController.js'

function mockRequestObject () {
  const sessionModel = new Map()
  const journeyModel = new Map()
  return { sessionModel, journeyModel, query: {}, headers: {} }
}

function mockMiddlewareArgs (reqOpts) {
  return {
    req: { ...mockRequestObject(), ...reqOpts },
    res: { redirect: vi.fn() },
    next: vi.fn()
  }
}

describe('CheckDeepLinkController', () => {
  let checkDeepLinkController

  beforeEach(() => {
    checkDeepLinkController = new CheckDeepLinkController({
      route: '/deep-link'
    })
  })

  describe('get()', () => {
    it('should redirect to check tool start page when params invalid', async () => {
      const { req, res, next } = mockMiddlewareArgs({ query: {} })
      await checkDeepLinkController.get(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/')
      expect(Array.from(req.sessionModel.keys())).toStrictEqual([])
      expect(next).toBeCalledTimes(0)
    })

    it('should update session with deep link info', async () => {
      const query = { dataset: 'article-4-direction', orgName: 'Adur District Council', orgId: 'local-authority:ADU' }
      const { req, res, next } = mockMiddlewareArgs({ query })

      await checkDeepLinkController.get(req, res, next)

      expect(req.sessionModel.get(checkDeepLinkController.sessionKey)).toStrictEqual({
        'data-subject': 'article-4-direction',
        orgName: 'Adur District Council',
        orgId: 'local-authority:ADU',
        dataset: 'article-4-direction',
        datasetName: 'article-4-direction' // This will use datasetSlug Fall back, which just return the slug.
      })
      expect(req.journeyModel.get('history').length).toBe(1)
    })
  })
})
