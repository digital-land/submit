import { describe, it, expect } from 'vitest'
import { getNavigationLinks } from '../../../src/filters/getNavigationLinks.js'

describe('getNavigationLinks', () => {
  it('returns an empty array when no links are provided', () => {
    const result = getNavigationLinks('/some-url', [])
    expect(result).toEqual([])
  })

  it('returns navigation links with correct active state', () => {
    const result = getNavigationLinks('/organisations', ['organisations', 'guidance'])

    expect(result).toEqual([
      {
        href: '/organisations',
        text: 'Find your organisation',
        active: true
      },
      {
        href: '/guidance',
        text: 'Guidance',
        active: false
      }
    ])
  })

  it('filters out undefined links', () => {
    const result = getNavigationLinks('/organisations', ['organisations', 'invalid-link'])

    expect(result).toEqual([
      {
        href: '/organisations',
        text: 'Find your organisation',
        active: true
      }
    ])
  })

  it('correctly identifies active links', () => {
    const result = getNavigationLinks('/guidance', ['organisations', 'guidance'])

    expect(result).toEqual([
      {
        href: '/organisations',
        text: 'Find your organisation',
        active: false
      },
      {
        href: '/guidance',
        text: 'Guidance',
        active: true
      }
    ])
  })

  it('handles non-matching current URLs', () => {
    const result = getNavigationLinks('/some-other-page', ['organisations', 'guidance'])

    expect(result).toEqual([
      {
        href: '/organisations',
        text: 'Find your organisation',
        active: false
      },
      {
        href: '/guidance',
        text: 'Guidance',
        active: false
      }
    ])
  })
})
