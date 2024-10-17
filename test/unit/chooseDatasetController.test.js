import ChooseDatasetController from '../../src/controllers/chooseDatasetController.js'

import { describe, it, vi, expect, beforeEach } from 'vitest'

describe('ChooseDatasetController', () => {
  let chooseDatasetController

  beforeEach(() => {
    chooseDatasetController = new ChooseDatasetController({
      route: '/dataset'
    })

    vi.mock(import('../../src/utils/utils.js'), async (importOriginal) => {
      const { availableDatasets } = await importOriginal()
      return {
        dataSubjects: {
          subject1: { available: true, dataSets: [{ available: true, text: 'B', value: 'B', requiresGeometryTypeSelection: true }, { available: false, text: 'A', value: 'A', requiresGeometryTypeSelection: false }] },
          subject2: { available: false, dataSets: [{ available: true, text: 'C', value: 'C', requiresGeometryTypeSelection: false }] },
          subject3: { available: true, dataSets: [{ available: true, text: 'A', value: 'A', requiresGeometryTypeSelection: true }] }
        },
        availableDatasets
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
    chooseDatasetController.locals(req, res, next)

    // Check if the datasets are correctly filtered and sorted
    expect(req.form.options.datasetItems).toEqual([{ available: true, text: 'A', value: 'A', requiresGeometryTypeSelection: true }, { available: true, text: 'B', value: 'B', requiresGeometryTypeSelection: true }])

    // Check if next is called
    expect(next).toHaveBeenCalled()
  })
})
