// test the validation lookup function

import { describe, it, expect, vi } from 'vitest'
import validationMessageLookup from '../../src/filters/validationMessageLookup.js'
import logger from '../../src/utils/logger.js'

describe('validationMessageLookup', () => {
  it('returns the correct message for a given field and type', () => {
    expect(validationMessageLookup('email-address', 'required')).toBe('Enter an email address')
  })

  it('returns a generic error if the lookup was not found', () => {
    expect(validationMessageLookup('email-address', 'missing')).toBe('An error occurred of type missing for field email-address')
  })

  it('logs an error if the lookup was not found', () => {
    vi.mock('../utils/logger.js', () => {
      return {
        error: vi.fn()
      }
    })

    const loggerErrorSpy = vi.spyOn(logger, 'error')

    validationMessageLookup('email-address', 'missing')

    expect(loggerErrorSpy).toHaveBeenCalledOnce()
    expect(loggerErrorSpy.mock.calls[0][0]).toBe('No validation message found for field email-address and type missing')
  })
})
