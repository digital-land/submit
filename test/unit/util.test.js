import * as util from '../../src/utils/utils.js'
import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest'

const dataSubjects = {
  subject1: {
    available: true,
    dataSets:
      [{ available: true, text: 'B', value: 'B', requiresGeometryTypeSelection: true },
        { available: false, text: 'D', value: 'D' }]
  },
  subject2: { available: false, dataSets: [{ available: true, text: 'C', value: 'C', requiresGeometryTypeSelection: false }] },
  subject3: { available: true, dataSets: [{ available: true, text: 'A', value: 'A', requiresGeometryTypeSelection: true }] }
}

describe('utils/utils', () => {
  it('makeDatasetsLookup()', () => {
    const lookup = util.makeDatasetsLookup(dataSubjects)

    expect(lookup.get('A')).toEqual({ ...dataSubjects.subject3.dataSets[0], dataSubject: 'subject3' })
    expect(lookup.get('B')).toEqual({ ...dataSubjects.subject1.dataSets[0], dataSubject: 'subject1' })
    expect(lookup.get('C')).toEqual({ ...dataSubjects.subject2.dataSets[0], dataSubject: 'subject2' })
    expect(lookup.get('D')).toEqual({ ...dataSubjects.subject1.dataSets[1], dataSubject: 'subject1' })

    const allDatasets = Object.entries(dataSubjects).map(([_, sub]) => sub.dataSets.map(ds => ds.value)).flat()
    const uniqueDatasets = new Set(allDatasets)
    expect(lookup.length).toBe(uniqueDatasets.length)
  })

  it('availableDatasets()', () => {
    const datasets = util.availableDatasets(dataSubjects)
    expect(new Set(datasets.map(ds => ds.value))).toEqual(new Set(['A', 'B']))
  })
})

describe('getDeadlineHistory', () => {
  beforeAll(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers()

    // set hour within business hours
    const date = new Date('2025-04-03T00:00:00.000Z')
    vi.setSystemTime(date)
  })

  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers()
  })

  it('returns an object with deadline dates', () => {
    const deadline = 'XXXX-03-15T14:30:00Z'
    const result = util.getDeadlineHistory(deadline)
    expect(result).toHaveProperty('deadlineDate')
    expect(result).toHaveProperty('lastYearDeadline')
    expect(result).toHaveProperty('twoYearsAgoDeadline')
  })

  it('when the deadline has past calculates deadline dates correctly', () => {
    const deadline = 'XXXX-03-15T00:00:00Z'
    const result = util.getDeadlineHistory(deadline)
    expect(result).toEqual({
      lastYearDeadline: new Date('2025-03-15T00:00:00.000Z'),
      deadlineDate: new Date('2026-03-15T00:00:00.000Z'),
      twoYearsAgoDeadline: new Date('2024-03-15T00:00:00.000Z')
    })
  })

  it('when the deadline hasn\'t past calculates deadline date correctly', () => {
    const deadline = 'XXXX-05-15T00:00:00Z'
    const result = util.getDeadlineHistory(deadline)
    expect(result).toEqual({
      lastYearDeadline: new Date('Tue, 15 May 2024 00:00:00'),
      deadlineDate: new Date('Wed, 15 May 2025 00:00:00'),
      twoYearsAgoDeadline: new Date('Tue, 15 May 2023 00:00:00')

    })
  })

  it('throws an error if invalid deadline format', () => {
    const deadline = ' invalid deadline format '
    expect(() => util.getDeadlineHistory(deadline)).toThrowError(`Invalid deadline format. Expected 'YYYY-MM-DDTHH:MM:SSSZ', got '${deadline}'`)
  })

  it('doesn\'t accept months > 12', () => {
    const deadline = 'XXXX-13-01T14:30:00Z'
    expect(() => util.getDeadlineHistory(deadline)).toThrowError(`Invalid deadline format. Expected 'YYYY-MM-DDTHH:MM:SSSZ', got '${deadline}'`)
  })

  it('returns correct deadline history for this year', () => {
    const deadline = 'XXXX-03-15T14:30:00Z'
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const result = util.getDeadlineHistory(deadline)
    expect(result.deadlineDate.getFullYear()).toBe(2026)
    expect(result.lastYearDeadline.getFullYear()).toBe(2025)
    expect(result.twoYearsAgoDeadline.getFullYear()).toBe(2024)
  })

  it('handles leap year correctly', () => {
    const deadline = '2024-02-29T14:30:00Z'
    const result = util.getDeadlineHistory(deadline)
    expect(result.deadlineDate.getFullYear()).toBe(2026)
    expect(result.lastYearDeadline.getFullYear()).toBe(2025)
    expect(result.twoYearsAgoDeadline.getFullYear()).toBe(2024)
  })
})
