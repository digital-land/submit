import { describe, it, expect } from 'vitest'

import toErrorList from '../../src/filters/toErrorList'

describe('toErrorList', () => {
  it('returns an empty array if there are no errors', () => {
    expect(toErrorList([])).toEqual([])
  })

  it('returns an array of errors', () => {
    expect(
      toErrorList({
        'email-address': {
          type: 'required'
        },
        'first-name': {
          type: 'required'
        }
      })
    ).toEqual([
      {
        text: 'Enter an email address',
        href: '#email-address'
      },
      {
        text: 'Enter your first name',
        href: '#first-name'
      }
    ])
  })
})
