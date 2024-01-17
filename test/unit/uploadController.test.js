import { describe, it, expect, vi, beforeEach } from 'vitest'

import mockApiValue from '../testData/API_RUN_PIPELINE_RESPONSE.json'

import UploadController from '../../src/controllers/uploadController.js'

describe('UploadController', () => {
  let uploadController
  const validateFileMock = vi.fn().mockReturnValue(mockApiValue)
  const unlinkMock = vi.fn()

  beforeEach(() => {
    const options = {
      route: '/upload'
    }
    uploadController = new UploadController(options)
  })

  it('post adds the validation result to the session and the error count to the controller while deleting the uploaded file', async () => {
    expect(uploadController.post).toBeDefined()

    uploadController.validateFile = validateFileMock

    vi.mock('fs/promises', async (importOriginal) => {
      return {
        default: {
          readFile: vi.fn(),
          unlink: unlinkMock
        }
      }
    })

    const req = {
      file: {
        path: 'aHashedFileName.csv',
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
    expect(uploadController.errorCount).toEqual(mockApiValue['issue-log'].filter(issue => issue.severity === 'error').length + mockApiValue['column-field-log'].filter(column => column.missing).length)
    expect(unlinkMock).toHaveBeenCalledWith(req.file.path)
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
      filePath: 'aHashedFileName.csv',
      originalname: 'test.csv',
      dataset: 'test',
      dataSubject: 'test',
      organization: 'local-authority-eng:CAT'
    }

    const result = await uploadController.validateFile(params)

    expect(result).toEqual({ test: 'test' })

    // expect().toHaveBeenCalledWith(config.api.url + config.api.validationEndpoint, expect.any(FormData))
  })

  describe('validators', () => {
    describe('file extension', () => {
      it('should return true if the file extension is one of the accepted extensions', () => {
        const allowedExtensions = ['csv', 'xls', 'xlsx', 'json', 'geojson', 'gml', 'gpkg']

        for (const extension of allowedExtensions) {
          expect(UploadController.extensionIsValid({ originalname: `test.${extension}` })).toEqual(true)
        }
      })

      it('should return false if the file extension is not one of the accepted extensions', () => {
        expect(UploadController.extensionIsValid({ originalname: 'test.exe' })).toEqual(false)
      })
    })

    describe('file size', () => {
      it('should return true if the file size is less than the max file size', () => {
        expect(UploadController.sizeIsValid({ size: 1000 })).toEqual(true)
      })

      it('should return false if the file size is greater than the max file size', () => {
        expect(UploadController.sizeIsValid({ size: 100000000 })).toEqual(false)
      })
    })

    describe('file name length', () => {
      it('should return true if the file name is less than the max file name length', () => {
        expect(UploadController.fileNameIsntTooLong({ originalname: 'a'.repeat(100) })).toEqual(true)
      })

      it('should return false if the file name is greater than the max file name length', () => {
        expect(UploadController.fileNameIsntTooLong({ originalname: 'a'.repeat(1000) })).toEqual(false)
      })
    })

    describe('file name', () => {
      it('should return true if the file name is valid', () => {
        expect(UploadController.fileNameIsValid({ originalname: 'test.csv' })).toEqual(true)
      })

      it('should return false if the file name contains invalid characters', () => {
        expect(UploadController.fileNameIsValid({ originalname: 'test.csv?' })).toEqual(false)
      })
    })

    describe('file name double extension', () => {
      it('should return true if the file name does not contain a double extension', () => {
        expect(UploadController.fileNameDoesntContainDoubleExtension({ originalname: 'test.csv' })).toEqual(true)
      })

      it('should return false if the file name contains a double extension', () => {
        expect(UploadController.fileNameDoesntContainDoubleExtension({ originalname: 'test.csv.csv' })).toEqual(false)
      })
    })
  })
})
