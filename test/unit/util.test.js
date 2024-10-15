import * as util from '../../src/utils/utils.js'
import { describe, it, expect } from 'vitest'

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
