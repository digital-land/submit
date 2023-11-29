import { describe, it, expect, vi, beforeEach } from 'vitest'

import mockApiValue from '../testData/API_RUN_PIPELINE_RESPONSE.json'

import UploadController from '../../src/controllers/uploadController.js'

describe('UploadController', () => {
  let uploadController
  const validateFileMock = vi.fn().mockReturnValue(mockApiValue)

  beforeEach(() => {
    const options = {
      route: '/upload'
    }
    uploadController = new UploadController(options)
  })

  it('post adds the validation result to the session and the error count to the controller', async () => {
    expect(uploadController.post).toBeDefined()

    uploadController.validateFile = validateFileMock

    const req = {
      file: {
        path: 'readme.md',
        originalname: 'conservation_area.csv'
      },
      sessionModel: {
        get: () => 'test',
        set: vi.fn()
      },
      body: {}
    }
    const res = {
      send: vi.fn(),
      redirect: vi.fn()
    }
    const next = vi.fn()

    await uploadController.post(req, res, next)

    expect(req.body.validationResult).toEqual(mockApiValue)
    expect(uploadController.errorCount).toEqual(mockApiValue['issue-log'].filter(issue => issue.severity === 'error').length)
  })

  it('validateFile correctly calls the API', async () => {
    vi.mock('axios', async () => {
      const actualAxios = vi.importActual('axios')
      return {
        default: {
          ...actualAxios.default,
          post: vi.fn().mockResolvedValue({ data: { test: 'test' } })
        }
      }
    })

    expect(uploadController.validateFile).toBeDefined()

    const params = {
      filePath: 'readme.md',
      fileName: 'conservation_area.csv',
      dataset: 'test',
      dataSubject: 'test',
      organization: 'local-authority-eng:CAT'
    }

    const result = await uploadController.validateFile(params)

    expect(result).toEqual({ test: 'test' })

    // expect().toHaveBeenCalledWith(config.api.url + config.api.validationEndpoint, expect.any(FormData))
  })
})
