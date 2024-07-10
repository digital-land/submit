import PageController from '../../src/controllers/pageController.js'

import { describe, it, vi, expect } from 'vitest'

import logger from '../../src/utils/logger.js'

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
    // pageController.super.get = vi.fn();
    await pageController.get(req, {}, vi.fn())
    expect(loggerInfoSpy).toHaveBeenCalledOnce()

    const callArgs = loggerInfoSpy.mock.calls[0][0]

    expect(callArgs.type).toEqual('PageView')
    expect(callArgs.pageRoute).toEqual('/dataset')
    expect(callArgs.message).toEqual('page view occurred for page: /dataset')
    expect(callArgs.sessionId).toEqual(await hash('123'))
    expect(callArgs.ipAddress).toBeUndefined()
    expect(callArgs.level).toEqual('info')
    expect(callArgs.service).toEqual('lpa-data-validation-frontend')
  })
})
