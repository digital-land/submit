import { describe, it, expect, beforeEach } from 'vitest'

import UploadController from '../../src/controllers/uploadController.js'

describe('UploadController', () => {
  let uploadController

  beforeEach(() => {
    const options = {
      route: '/upload'
    }
    uploadController = new UploadController(options)
  })

  it('resetValidationErrorMessage', ({ assert }) => {
    uploadController.validationErrorMessage = 'Error message'
    uploadController.resetValidationErrorMessage()
    expect(uploadController.validationErrorMessage).toBe(undefined)
  })

  it('validationError', ({ assert }) => {
    const errorObject = new Error('Test error')
    uploadController.validationError('TestType', 'Test message', errorObject, {})
    expect(uploadController.validationErrorMessage).toBe('Test message')
  })

  it('getBaseFormData', ({ assert }) => {
    const req = {
      sessionModel: {
        get: (key) => key === 'dataset' ? 'Test dataset' : key === 'data-subject' ? 'Test subject' : 'Test geomType'
      },
      session: {
        id: 'Test session id'
      }
    }
    const result = uploadController.getBaseFormData(req)
    expect(result.dataset).toBe('Test dataset')
    expect(result.collection).toBe('Test subject')
    expect(result.geomType).toBe('Test geomType')
    expect(result.sessionId).toBe('Test session id')
  })
})
