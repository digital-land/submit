import { describe, it, expect } from 'vitest'
import { validUrl, validGovUkEmail } from '../../src/utils/validators'

describe('validUrl', () => {
  it('should return true for a valid URL', () => {
    const url = 'https://www.example.com'
    const result = validUrl(url)
    expect(result).toBe(true)
  })

  it('should return false for an invalid URL', () => {
    const url = 'example.com'
    const result = validUrl(url)
    expect(result).toBe(false)
  })

  it('should return false for an empty string', () => {
    const url = ''
    const result = validUrl(url)
    expect(result).toBe(false)
  })

  it('should return false for a null value', () => {
    const url = null
    const result = validUrl(url)
    expect(result).toBe(false)
  })

  it('should return false for an undefined value', () => {
    const url = undefined
    const result = validUrl(url)
    expect(result).toBe(false)
  })
})

describe('validGovUkEmail', () => {
  it.each(['user@council.gov.uk', 'USER@COUNCIL.GOV.UK', ' user@planning.council.gov.uk '])('accepts %j', email => {
    expect(validGovUkEmail(email)).toBe(true)
  })
  it.each(['user@example.org.uk', 'user@notgov.uk', 'user@council.gov.uk.evil.com', 'user@@council.gov.uk', 'user@-council.gov.uk', 'user@council-.gov.uk', '', null, ['user@council.gov.uk']])('rejects %j', email => {
    expect(validGovUkEmail(email)).toBe(false)
  })
})
