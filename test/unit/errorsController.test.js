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
        rows: [
          {
            entryNumber: '1',
            columns: {
              'Document URL': {
                error: false,
                value: 'https://www.camden.gov.uk/holly-lodge-conservation-area'
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
                value: 'Holly Lodge Estate'
              },
              Notes: {
                error: false,
                value: ''
              },
              Point: {
                error: false,
                value: 'POINT (-0.150097204178 51.564975754948)'
              },
              Reference: {
                error: false,
                value: 'CA20'
              },
              'Start date': {
                error: false,
                value: '01/06/1992'
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
          }
        ],
        issueCounts: {
          'entry-date': 1,
          geometry: 1,
          organisation: 1
        },
        dataset: 'test-dataset',
        dataSubject: 'test-data-subject'
      }
    }

    expect(req.form).toEqual(expectedFormValues)
  })
})
