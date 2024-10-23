import PageController from '../../src/controllers/pageController.js'

import { describe, it, vi, expect } from 'vitest'

import logger from '../../src/utils/logger.js'
import { types } from '../../src/utils/logging.js'

import hash from '../../src/utils/hasher.js'

describe('PageController', () => {
  vi.mock('../utils/logger.js', () => {
    return {
      info: vi.fn()
    }
  })

  const loggerInfoSpy = vi.spyOn(logger, 'info')

  it('Correctly creates a log when the page is viewed', async () => {
    const req = {
      originalUrl: '/dataset',
      sessionID: '123',
      ip: '1234'
    }
    const pageController = new PageController({
      route: '/dataset'
    })
    pageController.get(req, {}, vi.fn())
    expect(loggerInfoSpy).toHaveBeenCalledOnce()

    const callArgs = loggerInfoSpy.mock.calls[0][0]

    expect(callArgs.type).toEqual(types.PageView)
    expect(callArgs.endpoint).toEqual('/dataset')
    expect(callArgs.message).toEqual('page view')
    expect(callArgs.sessionId).toEqual(hash('123'))
    expect(callArgs.ipAddress).toBeUndefined()
    expect(callArgs.level).toEqual('info')
    expect(callArgs.service).toEqual('lpa-data-validation-frontend')
  })
})

describe('Correctly detects the wizard back link', () => {
  const referer = '/this-is-where-we-came-from'
  const makeReq = () => {
    return ({
      originalUrl: '/check/upload-method',
      sessionID: '123',
      sessionModel: {
        get: vi.fn().mockReturnValue({ referer })
      },
      form: {
        options: {}
      }
    })
  }

  it('arriving at the deep link entry point', () => {
    const pageController = new PageController({ route: '/upload-method' })
    const req = makeReq()
    pageController.locals(req, {}, vi.fn())
    expect(req.form.options.lastPage).toEqual(referer)
  })

  it('arriving at some other step', () => {
    const pageController = new PageController({ route: '/upload-method' })
    const req = { ...makeReq(), originalUrl: '/check/another-step' }
    pageController.locals(req, {}, vi.fn())
    expect(req.form.options.lastPage).toBe(undefined)
  })

  it('don\'t touch the back link if there\'s no deep link session info (lastPage not set)', () => {
    const pageController = new PageController({ route: '/upload-method' })
    const req = { ...makeReq(), sessionModel: new Map() }
    pageController.locals(req, {}, vi.fn())
    expect(req.form.options.lastPage).toEqual(undefined)
  })

  it('don\'t touch the back link if there\'s no deep link session info (lastPage set)', () => {
    const pageController = new PageController({ route: '/upload-method' })
    pageController.options.backLink = '/go-back'
    const req = { ...makeReq(), sessionModel: new Map() }
    pageController.locals(req, {}, vi.fn())
    expect(req.form.options.lastPage).toEqual('/go-back')
  })
})
