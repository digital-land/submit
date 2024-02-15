import { describe, it, expect } from 'vitest'
import prettifyColumnName from '../../src/filters/prettifyColumnName'

describe('prettifyColumnName', () => {
  it('should capitalize the first letter of the first word', () => {
    expect(prettifyColumnName('start-date')).toBe('Start date')
  })

  it('should make "url" uppercase', () => {
    expect(prettifyColumnName('document-url')).toBe('Document URL')
  })

  it('should handle strings with no underscores or spaces', () => {
    expect(prettifyColumnName('geography')).toBe('Geography')
  })

  it('should handle strings with spaces', () => {
    expect(prettifyColumnName('start date')).toBe('Start date')
  })

  it('should handle strings with mixed underscores and spaces', () => {
    expect(prettifyColumnName('document-url start date-is today')).toBe('Document URL start date is today')
  })
})
