import PageController from '../../src/controllers/pageController.js'

import { describe, it, vi, expect } from 'vitest'

import logger from '../../src/utils/logger.js'

describe('PageController', () => {
  const loggerInfoMock = vi.fn()

  vi.mock('../utils/logger.js', () => {
    return {
      info: loggerInfoMock
    }
  })

  const loggerInfoSpy = vi.spyOn(logger, 'info')

  it('Correctly creates a log when the page is viewed', () => {
    const req = {
      originalUrl: '/dataset',
      sessionID: '123',
      ip: '1234'
    }
    const pageController = new PageController({
      route: '/dataset'
    })
    // pageController.super.get = vi.fn();
    pageController.get(req, {}, vi.fn())
    expect(loggerInfoSpy).toHaveBeenCalledOnce()

    const callArgs = loggerInfoSpy.mock.calls[0][0]

    expect(callArgs.type).toEqual('PageView')
    expect(callArgs.pageRoute).toEqual('/dataset')
    expect(callArgs.message).toEqual('page view occurred for page: /dataset')
    expect(callArgs.sessionId).toEqual('123')
    expect(callArgs.ipAddress).toEqual('1234')
    expect(callArgs.level).toEqual('info')
    expect(callArgs.service).toEqual('lpa-data-validation-frontend')
  })
})
