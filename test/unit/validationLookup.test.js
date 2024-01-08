// test the validation lookup function

import { describe, it, expect } from 'vitest'
import validationMessageLookup from '../../src/filters/validationMessageLookup.js'

describe('validationMessageLookup', () => {
  it('returns the correct message for a given field and type', () => {
    expect(validationMessageLookup('email-address', 'required')).toBe('Enter an email address')
  })

  it('throws an error if the field or type is not found', () => {
    expect(() => validationMessageLookup('email-address', 'missing')).toThrow('No validation message found for field email-address and type missing')
  })
})
