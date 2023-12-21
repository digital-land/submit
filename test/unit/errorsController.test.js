import ErrorsController from '../../src/controllers/errorsController.js'

import { describe, it, expect, vi } from 'vitest'

import mockApiValue from '../testData/API_RUN_PIPELINE_RESPONSE.json'

describe('ErrorsController', () => {
  const options = {
    route: '/errors'
  }
  const errorsController = new ErrorsController(options)

  it('passes the correct options to the errors page', async () => {
    const session = {
      validationResult: mockApiValue,
      dataset: 'test-dataset',
      'data-subject': 'test-data-subject'
    }
    const req = {
      sessionModel: {
        get: (key) => session[key]
      },
      form: {
        options: {
        }
      }
    }
    const res = {}
    const next = vi.fn()

    await errorsController.get(req, res, next)

    const expectedFormValues = {
      options: {
        columnNames: [
          'Reference',
          'Name',
          'Geometry',
          'Start date',
          'Legislation',
          'Notes',
          'Point',
          'End date',
          'Document URL'
        ],
        rows: [
          {
            'Document URL': {
              issue: false,
              value: 'https://www.camden.gov.uk/camden-square-conservation-area-appraisal-and-management-strategy'
            },
            'End date': {
              issue: false,
              value: ''
            },
            Geometry: {
              issue: false,
              value: 'POLYGON ((-0.125888391245 51.54316508186, -0.125891457623 51.543177267548, -0.125903428774 51.54322160042))'
            },
            Legislation: {
              issue: false,
              value: ''
            },
            Name: {
              issue: false,
              value: 'Camden Square'
            },
            Notes: {
              issue: false,
              value: ''
            },
            Point: {
              issue: false,
              value: 'POINT (-0.130484959448 51.544845663239)'
            },
            Reference: {
              issue: false,
              value: 'CA6'
            },
            'Start date': {
              issue: {
                type: 'invalid-value',
                description: 'invalid-value'
              },
              value: '40/04/1980'
            }
          }
        ],
        issueCounts: {
          'Start date_invalid-value': {
            count: 1,
            description: 'invalid-value',
            type: 'invalid-value',
            field: 'Start date'
          }
        }
      }
    }

    expect(req.form).toEqual(expectedFormValues)
  })
})
