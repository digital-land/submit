import ErrorsController from '../../src/controllers/errorsController.js'

import { describe, it, expect, vi } from 'vitest'

import mockApiValue from '../testData/API_RUN_PIPELINE_RESPONSE.json'

describe('ErrorsController', () => {
  const options = {
    route: '/errors'
  }
  const errorsController = new ErrorsController(options)

  it('correctly serves the errors page when the session data is correctly set', async () => {
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
          'Document URL',
          'geometry',
          'organisation',
          'entry-date'
        ],
        rows: [
          {
            'Document URL': {
              error: false,
              value: 'https://www.camden.gov.uk/camden-square-conservation-area-appraisal-and-management-strategy'
            },
            'End date': {
              error: false,
              value: ''
            },
            Geometry: {
              error: false,
              value: 'POLYGON ((-0.125888391245 51.54316508186, -0.125891457623 51.543177267548, -0.125903428774 51.54322160042))'
            },
            Legislation: {
              error: false,
              value: ''
            },
            Name: {
              error: false,
              value: 'Camden Square'
            },
            Notes: {
              error: false,
              value: ''
            },
            Point: {
              error: false,
              value: 'POINT (-0.130484959448 51.544845663239)'
            },
            Reference: {
              error: false,
              value: 'CA6'
            },
            'Start date': {
              error: false,
              value: '01/04/1980'
            },
            'entry-date': {
              error: 'default-value',
              value: undefined
            },
            geometry: {
              error: 'OSGB',
              value: undefined
            },
            organisation: {
              error: 'default-value',
              value: undefined
            }
          }
        ],
        issueCounts: {
          'entry-date': 1,
          geometry: 1,
          organisation: 1
        }
      }
    }

    expect(req.form).toEqual(expectedFormValues)
  })
})
