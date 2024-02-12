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

  describe('resultIsValid', () => {
    it('should return false if validationResult is undefined', () => {
      expect(UploadController.resultIsValid(undefined)).toBe(false)
    })

    it('should return false if validationResult.error is true', () => {
      expect(UploadController.resultIsValid({ error: true })).toBe(false)
    })

    it('should return true if validationResult.error is not true', () => {
      expect(UploadController.resultIsValid({ error: false })).toBe(true)
    })
  })

  describe('hasErrors', () => {
    it('should return false if errorCount is 0', () => {
      uploadController.errorCount = 0
      expect(uploadController.hasErrors()).toBe(false)
    })

    it('should return true if errorCount is greater than 0', () => {
      uploadController.errorCount = 1
      expect(uploadController.hasErrors()).toBe(true)
    })
  })

  describe('handleValidationResult', () => {
    it('should handle an error result', () => {
      const req = { body: {} }
      const jsonResult = { error: true, message: 'Test error', errorObject: {} }
      uploadController.handleValidationResult(jsonResult, req)

      expect(req.body.validationResult).toEqual(jsonResult)
      expect(uploadController.validationErrorMessage).toBe('Test error')
    })

    it('should handle a successful result', () => {
      const req = { body: {} }
      const jsonResult = {
        'issue-log': [{ severity: 'error' }],
        'column-field-log': [{ missing: true }]
      }

      uploadController.handleValidationResult(jsonResult, req)

      expect(req.body.validationResult).toEqual(jsonResult)
      expect(uploadController.errorCount).toBe(2)
    })
  })

  describe('handleApiError', () => {
    it('should handle a connection refused error', () => {
      const req = {
        body: {}
      }
      const error = { code: 'ECONNREFUSED' }

      uploadController.handleApiError(error, req)

      expect(uploadController.validationErrorMessage).toBe('Unable to reach the api')
    })
  })
})
