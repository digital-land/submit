import DatasetController, {
  requiresGeometryTypeToBeSelected,
  requiresGeometryTypeToBeSelectedViaDeepLink
} from '../../src/controllers/datasetController.js'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import { initDatasetSlugToReadableNameFilter } from '../../src/utils/datasetSlugToReadableName.js'

describe('DatasetController', () => {
  let datasetController

  beforeEach(async () => {
    datasetController = new DatasetController({
      route: '/dataset'
    })

    vi.mock(import('../../src/utils/utils.js'), async (importOriginal) => {
      // const { availableDatasets, makeDatasetsLookup } = await importOriginal()
      const actual = await importOriginal()
      const dataSubjects = {
        subject1: {
          available: true,
          dataSets:
            [{ available: true, text: 'B', value: 'B', requiresGeometryTypeSelection: true },
              { available: false, text: 'D', value: 'D', requiresGeometryTypeSelection: false }]
        },
        subject2: { available: false, dataSets: [{ available: true, text: 'C', value: 'C', requiresGeometryTypeSelection: false }] },
        subject3: { available: true, dataSets: [{ available: true, text: 'A', value: 'A', requiresGeometryTypeSelection: true }] }
      }
      return {
        // availableDatasets,
        // dataSubjects,
        // datasets: makeDatasetsLookup(dataSubjects)
        ...actual,
        getDataSubjects: vi.fn(async () => dataSubjects),
        getDatasets: vi.fn(async () => actual.makeDatasetsLookup(dataSubjects)),
        availableDatasets: vi.fn(() => actual.availableDatasets(dataSubjects))
      }
    })

    await initDatasetSlugToReadableNameFilter()
  })

  it('locals correctly filters and sorts available datasets and assigns them to req.form.options.datasetItems', async () => {
    // Mock dataSubjects

    // Mock req, res, next
    const req = { form: { options: {} } }
    const res = {}
    const next = vi.fn()

    // Call locals function
    await datasetController.locals(req, res, next)

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
    await datasetController.post(req, res, next)

    // Check if the data-subject is correctly set
    expect(req.body['data-subject']).toEqual('subject1')

    // Check if next is called
    expect(next).toHaveBeenCalled()
  })

  it('Correctly determines whether a geometry type selection is required', async () => {
    // Mock req with dataset that requires geometry type selection
    const req1 = { body: { dataset: 'B' } }
    expect(await requiresGeometryTypeToBeSelected(req1)).toEqual(true)

    // Mock req with dataset that does not require geometry type selection
    const req2 = { body: { dataset: 'D' } }
    expect(await requiresGeometryTypeToBeSelected(req2)).toEqual(false)

    // Mock req with no dataset
    const req3 = { body: {} }
    expect(await requiresGeometryTypeToBeSelected(req3)).toEqual(false)
  })

  it('Correctly determines whether a geometry type selection is required via deep link', async () => {
    // Mock req with dataset that requires geometry type selection
    const req1 = { query: { dataset: 'B' } }
    expect(await requiresGeometryTypeToBeSelectedViaDeepLink(req1)).toEqual(true)

    // Mock req with dataset that does not require geometry type selection
    const req2 = { query: { dataset: 'D' } }
    expect(await requiresGeometryTypeToBeSelectedViaDeepLink(req2)).toEqual(false)

    // Mock req with no dataset
    const req3 = { query: {} }
    expect(await requiresGeometryTypeToBeSelectedViaDeepLink(req3)).toEqual(false)
  })
})
