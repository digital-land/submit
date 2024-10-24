import { describe, it, vi, expect, beforeEach } from 'vitest'
import DeepLinkController from '../../src/controllers/deepLinkController.js'

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

describe('DeepLinkController', () => {
  let deepLinkController

  beforeEach(() => {
    deepLinkController = new DeepLinkController({
      route: '/deep-link'
    })
  })

  describe('get()', () => {
    it('should redirect to check tool start page when params invalid', async () => {
      const { req, res, next } = mockMiddlewareArgs({ query: {} })
      deepLinkController.get(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/check')
      expect(Array.from(req.sessionModel.keys())).toStrictEqual([])
      expect(next).toBeCalledTimes(0)
    })

    it('should update session with deep link info', async () => {
      const query = { dataset: 'conservation-area', orgName: 'Some Org' }
      const { req, res, next } = mockMiddlewareArgs({ query })

      deepLinkController.get(req, res, next)

      expect(req.sessionModel.get(deepLinkController.checkToolDeepLinkSessionKey)).toStrictEqual({
        'data-subject': 'conservation-area',
        orgName: 'Some Org',
        dataset: 'conservation-area',
        datasetName: 'Conservation area dataset'
      })
      expect(req.journeyModel.get('history').length).toBe(1)
      expect(next).toBeCalledTimes(1)
    })
  })
})
