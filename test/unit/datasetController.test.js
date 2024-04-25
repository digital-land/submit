import DatasetController from '../../src/controllers/datasetController.js'

import { describe, it, vi, expect, beforeEach } from 'vitest'

describe('DatasetController', () => {
  let datasetController

  beforeEach(() => {
    datasetController = new DatasetController({
      route: '/dataset'
    })

    vi.mock('../../src/utils/utils.js', () => {
      return {
        dataSubjects: {
          subject1: { available: true, dataSets: [{ available: true, text: 'B', value: 'B', requiresGeometryTypeSelection: true }, { available: false, text: 'A', value: 'A', requiresGeometryTypeSelection: false }] },
          subject2: { available: false, dataSets: [{ available: true, text: 'C', value: 'C', requiresGeometryTypeSelection: false }] },
          subject3: { available: true, dataSets: [{ available: true, text: 'A', value: 'A', requiresGeometryTypeSelection: true }] }
        }
      }
    })
  })

  it('locals correctly filters and sorts available datasets and assigns them to req.form.options.datasetItems', async () => {
    // Mock dataSubjects

    // Mock req, res, next
    const req = { form: { options: {} } }
    const res = {}
    const next = vi.fn()

    // Call locals function
    datasetController.locals(req, res, next)

    // Check if the datasets are correctly filtered and sorted
    expect(req.form.options.datasetItems).toEqual([{ available: true, text: 'A', value: 'A', requiresGeometryTypeSelection: true }, { available: true, text: 'B', value: 'B', requiresGeometryTypeSelection: true }])

    // Check if next is called
    expect(next).toHaveBeenCalled()
  })

  it('Correctly sets the data-subject based on the selected dataset', async () => {
    // Mock req, res, next
    const req = { body: { dataset: 'B' } }
    const res = {}
    const next = vi.fn()

    // Call post function
    datasetController.post(req, res, next)

    // Check if the data-subject is correctly set
    expect(req.body['data-subject']).toEqual('subject1')

    // Check if next is called
    expect(next).toHaveBeenCalled()
  })

  it('Correctly determines whether a geometry type selection is required', () => {
  // Mock req with dataset that requires geometry type selection
    const req1 = { body: { dataset: 'B' } }
    expect(datasetController.requiresGeometryTypeToBeSelected(req1)).toEqual(true)

    // Mock req with dataset that does not require geometry type selection
    const req2 = { body: { dataset: 'A' } }
    expect(datasetController.requiresGeometryTypeToBeSelected(req2)).toEqual(false)

    // Mock req with no dataset
    const req3 = { body: {} }
    expect(datasetController.requiresGeometryTypeToBeSelected(req3)).toEqual(false)
  })
})
