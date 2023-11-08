// write a hello world test in vitest

// Path: test/unit/test.test.js

import UploadController from '../../src/controllers/uploadController.js'

import { describe, it, expect, vi } from 'vitest'

import mockApiValue from '../testData/API_RUN_PIPELINE_RESPONSE.json'

describe('UploadController', () => {
  const options = {
    route: '/upload'
  }
  const uploadController = new UploadController(options)
  it('posting correct data adds the validation result to the session', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockApiValue)
    })

    expect(uploadController.post).toBeDefined()

    const req = {
      file: {
        path: 'readme.md',
        originalname: 'conservation_area.csv'
      },
      sessionModel: {
        get: () => 'test',
        set: vi.fn()
      }
    }
    const res = {
      send: vi.fn(),
      redirect: vi.fn()
    }
    const next = vi.fn()

    await uploadController.post(req, res, next)

    expect(req.sessionModel.set).toHaveBeenCalledWith('validationResult', mockApiValue)
  })
})
