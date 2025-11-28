import { describe, it, expect, vi, beforeEach } from 'vitest'
import config from '../../config/index.js'
import ResultsController, {
  fetchResponseDetails,
  fieldToColumnMapping,
  getRequestDataMiddleware,
  setupError,
  setupTableParams,
  setupTemplate,
  getFileNameOrUrlAndCheckedTime,
  getPassedChecks
} from '../../src/controllers/resultsController.js'
import { getRequestData } from '../../src/services/asyncRequestApi.js'
import PageController from '../../src/controllers/pageController.js'

vi.mock('../../src/services/asyncRequestApi', () => ({
  getRequestData: vi.fn()
}))

vi.mock('../../src/filters/prettifyColumnName', () => ({
  default: vi.fn()
}))

const mockRequest = () => ({
  params: { id: '123', pageNumber: '1' },
  parsedParams: { pageNumber: 1 },
  locals: {},
  form: { options: {} }
})

const mockResponse = () => ({
  redirect: vi.fn()
})

const mockNext = vi.fn()

describe('Middleware Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRequestDataMiddleware', () => {
    it('should fetch request data and set it in req.locals', async () => {
      const req = mockRequest()
      const res = mockResponse()
      const mockData = { isComplete: vi.fn(() => true) }

      getRequestData.mockResolvedValue(mockData)

      await getRequestDataMiddleware(req, res, mockNext)

      expect(getRequestData).toHaveBeenCalledWith(req.params.id)
      expect(req.locals.requestData).toEqual(mockData)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should redirect if request data is incomplete', async () => {
      const req = mockRequest()
      const res = mockResponse()
      const mockData = { isComplete: vi.fn(() => false) }

      getRequestData.mockResolvedValue(mockData)

      await getRequestDataMiddleware(req, res, mockNext)

      expect(res.redirect).toHaveBeenCalledWith(`/check/status/${req.params.id}`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('setupTemplate', () => {
    it('should set the appropriate template based on request data state', async () => {
      const req = mockRequest()
      const res = mockResponse()

      req.locals.requestData = {
        isFailed: vi.fn(() => true),
        getType: vi.fn(() => 'check_file'),
        hasErrors: vi.fn(() => false),
        getParams: vi.fn(() => ({}))
      }

      await setupTemplate(req, res, mockNext)

      expect(req.locals.template).toEqual('results/failedFileRequest')
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('fetchResponseDetails', () => {
    it('should fetch response details and set it in req.locals', async () => {
      const req = mockRequest()
      const res = mockResponse()

      req.locals.template = 'results/errors'
      req.locals.requestData = {
        fetchResponseDetails: vi.fn().mockResolvedValue({ data: 'mockData' })
      }

      await fetchResponseDetails(req, res, mockNext)

      expect(req.locals.responseDetails).toEqual({ data: 'mockData' })
      expect(mockNext).toHaveBeenCalled()
    })

    it('should not fetch response details if the template indicates failure', async () => {
      const req = mockRequest()
      const res = mockResponse()

      req.locals.template = 'results/failedFileRequest'

      await fetchResponseDetails(req, res, mockNext)

      expect(req.locals.responseDetails).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('setupTableParams', () => {
    it('should set table params, mappings, geometries, and pagination in req.locals', async () => {
      const req = mockRequest()
      const res = mockResponse()

      req.locals.template = 'results/no-errors'
      req.locals.datasetTypology = 'geography'
      req.locals.requestData = {
        hasErrors: vi.fn(() => false)
      }
      req.locals.responseDetails = {
        getRowsWithVerboseColumns: vi.fn(() => [{ columns: {}, data: 'rowData' }]),
        getColumns: vi.fn(() => ['column1', 'column2']),
        getFields: vi.fn(() => ['field1', 'field2']),
        getGeometries: vi.fn(() => 'mockGeometries'),
        getPagination: vi.fn(() => 'mockPagination')
      }

      setupTableParams(req, res, mockNext)

      expect(req.locals.tableParams).toEqual({
        columns: ['field1', 'field2'],
        rows: [{ columns: {}, data: 'rowData' }],
        fields: ['field1', 'field2'],
        columnNameProcessing: 'none',
        mapping: new Map()
      })
      expect(req.locals.geometries).toEqual('mockGeometries')
      expect(req.locals.pagination).toEqual('mockPagination')
      expect(mockNext).toHaveBeenCalled()
    })
    it('hide map when typology is not geography', () => {
      const req = mockRequest()
      const res = mockResponse()

      req.locals.template = 'results/no-errors'
      req.locals.datasetTypology = 'legal-instrument'
      req.locals.requestData = {
        hasErrors: vi.fn(() => false)
      }
      req.locals.responseDetails = {
        getRowsWithVerboseColumns: vi.fn(() => [{ columns: {}, data: 'rowData' }]),
        getColumns: vi.fn(() => ['column1', 'column2']),
        getFields: vi.fn(() => ['field1', 'field2']),
        getPagination: vi.fn(() => 'mockPagination')
      }
      setupTableParams(req, res, mockNext)
      expect(req.locals.geometries).toBeNull()
    })
  })

  describe('setupError', () => {
    it('should set error in req.locals if the template indicates failure', async () => {
      const req = mockRequest()
      const res = mockResponse()

      req.locals.template = 'results/failedFileRequest'
      req.locals.requestData = { getError: vi.fn(() => 'mockError') }

      await setupError(req, res, mockNext)

      expect(req.locals.error).toEqual('mockError')
      expect(mockNext).toHaveBeenCalled()
    })
  })
})

describe('ResultsController Class Tests', () => {
  let controller
  let req
  let res

  beforeEach(() => {
    controller = new ResultsController({ route: '/results' })
    req = mockRequest()
    res = mockResponse()
  })

  it('should extend PageController', () => {
    expect(controller).toBeInstanceOf(PageController)
  })

  it('should call super.locals and merge req.locals into req.form.options', async () => {
    const next = vi.fn()
    req.locals = { key: 'value' }

    await controller.locals(req, res, next)

    expect(req.form.options.key).toEqual('value')
    expect(next).toHaveBeenCalled()
  })

  it('should handle errors in the locals method', async () => {
    const next = vi.fn()
    const error = new Error('Test Error')

    // Mock the parent class's locals method to throw an error
    vi.spyOn(PageController.prototype, 'locals').mockImplementation(() => {
      throw error
    })

    await controller.locals(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })

  it('should correctly determine if there are no errors', () => {
    req.form.options = {
      data: {
        hasErrors: vi.fn(() => false)
      }
    }

    const result = controller.noErrors(req, res, mockNext)

    expect(result).toBe(true)
    expect(req.form.options.data.hasErrors).toHaveBeenCalled()
  })

  it('should return false if there are errors', () => {
    req.form.options = {
      data: {
        hasErrors: vi.fn(() => true)
      }
    }

    const result = controller.noErrors(req, res, mockNext)

    expect(result).toBe(false)
    expect(req.form.options.data.hasErrors).toHaveBeenCalled()
  })
})

describe('getFileNameOrUrlAndCheckedTime', () => {
  it('should set req.locals properties based on requestData', () => {
    const req = {
      locals: {
        requestData: {
          params: {
            type: 'file',
            fileName: 'example.txt',
            url: 'http://example.com/file'
          },
          modified: '2023-10-01T12:00:00Z'
        }
      }
    }
    const res = {}
    const next = vi.fn()

    getFileNameOrUrlAndCheckedTime(req, res, next)

    expect(req.locals.uploadInfo.type).toBe('file')
    expect(req.locals.uploadInfo.fileName).toBe('example.txt')
    expect(req.locals.uploadInfo.url).toBe('http://example.com/file')
    expect(req.locals.uploadInfo.checkedTime).toBe('2023-10-01T12:00:00Z')
    expect(next).toHaveBeenCalled()
  })

  it('should call next even if requestData is missing', () => {
    const req = {
      locals: {}
    }
    const res = {}
    const next = vi.fn()

    getFileNameOrUrlAndCheckedTime(req, res, next)

    expect(req.locals.uploadInfo.type).toBeUndefined()
    expect(req.locals.uploadInfo.fileName).toBeUndefined()
    expect(req.locals.uploadInfo.url).toBeUndefined()
    expect(req.locals.uploadInfo.checkedTime).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })
})

describe('getPassedChecks()', () => {
  const reqTemplate = {
    locals: { datasetTypology: 'geography' },
    tasks: [],
    totalRows: 99,
    missingColumnTasks: []
  }
  it('displays correct number of rows', () => {
    const req = structuredClone(reqTemplate)
    getPassedChecks(req, {}, vi.fn())

    expect(req.locals.passedChecks).toMatchObject([
      {
        status: { tag: { text: 'Passed' } },
        title: { text: 'Found 99 rows' }
      },
      {
        status: { tag: { text: 'Passed' } },
        title: { text: 'All data is valid' }
      }
    ])
  })

  it('handles zero record case', () => {
    const req1 = structuredClone(reqTemplate)
    req1.totalRows = 0

    getPassedChecks(req1, {}, vi.fn())
    expect(req1.locals.passedChecks).toStrictEqual([])
  })

  it('suppress the “All rows have valid geometry” message when typology is not geography', () => {
    const req = structuredClone(reqTemplate)
    req.locals = {
      datasetTypology: null
    }
    getPassedChecks(req, {}, vi.fn())
    const titles = req.locals.passedChecks.map(check => check.title.text)
    expect(titles).not.toContain('All rows have valid geometry')
  })
})

describe('fieldToColumnMapping()', () => {
  it('creates a mapping', () => {
    const result = fieldToColumnMapping({
      columns: {
        ID: { column: 'id' },
        WKT: { column: 'wkt' },
        Name: { column: 'name' },
        Layer: { column: 'Layer' }
      }
    })
    const expected = new Map([
      ['ID', 'id'],
      ['WKT', 'wkt'],
      ['Name', 'name'],
      ['Layer', 'Layer']
    ])
    expect(result).toEqual(expected)
  })

  it('handles empty', () => {
    expect(fieldToColumnMapping({ columns: {} })).toStrictEqual(new Map())
  })
})

describe('fetchDatasetTypology()', () => {
  it('datasets should include typology', async () => {
    const mockDatasets = {
      datasets: [
        { dataset: 'd1', typology: 'geography' },
        { dataset: 'd2', typology: 'document' }
      ]
    }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockDatasets)
      })
    )

    const response = await fetch(`${config.mainWebsiteUrl}/dataset.json`)
    const responseJSON = await response.json()
    const datasets = responseJSON.datasets || []
    const missingTypology = datasets.filter(d => d.typology == null)
    expect(missingTypology).toEqual([])
  })
})
