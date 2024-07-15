// test the validation lookup function

import { describe, it, expect, vi } from 'vitest'
import validationMessageLookup from '../../src/filters/validationMessageLookup.js'

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
    validationMessageLookup('email-address', 'missing')
  })
})
