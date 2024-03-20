import { describe, it, expect, vi, beforeEach } from 'vitest'

import mockApiValue from '../testData/API_RUN_PIPELINE_RESPONSE.json'

import UploadFileController from '../../src/controllers/uploadFileController.js'

import fs from 'fs/promises'

describe('UploadFileController', () => {
  let uploadFileController
  const apiValidateFileMock = vi.fn().mockReturnValue(mockApiValue)
  const localValidateFileMock = vi.fn().mockReturnValue(true)
  const constructBaseFormDataMock = vi.fn().mockReturnValue({ append: vi.fn() })

  beforeEach(() => {

  })

  it('post adds the validation result to the session and the error count to the controller while deleting the uploaded file', async () => {
    const options = {
      route: '/upload'
    }
    UploadFileController.localValidateFile = localValidateFileMock
    uploadFileController = new UploadFileController(options)
    uploadFileController.apiValidateFile = apiValidateFileMock

    expect(uploadFileController.post).toBeDefined()

    vi.mock('fs/promises', async (importOriginal) => {
      return {
        default: {
          readFile: vi.fn(),
          unlink: vi.fn()
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
      body: {},
      session: {
        id: 'sessionId'
      },
      ip: 'fakeIp'
    }
    const res = {
      send: vi.fn(),
      redirect: vi.fn()
    }
    const next = vi.fn()

    await uploadFileController.post(req, res, next)

    expect(localValidateFileMock).toHaveBeenCalledWith({
      ...req.file,
      filePath: req.file.path,
      fileName: req.file.originalname
    })
    expect(apiValidateFileMock).toHaveBeenCalledWith({
      ...req.file,
      filePath: req.file.path,
      fileName: req.file.originalname,
      dataset: 'test',
      dataSubject: 'test',
      geomType: 'test',
      sessionId: 'sessionId'
    })
    expect(req.body.validationResult).toEqual(mockApiValue)
    expect(uploadFileController.errorCount).toEqual(mockApiValue['issue-log'].filter(issue => issue.severity === 'error').length + mockApiValue['column-field-log'].filter(column => column.missing).length)
    expect(fs.unlink).toHaveBeenCalledWith(req.file.path)
  })

  it('apiValidateFile correctly calls the API', async () => {
    const options = {
      route: '/upload'
    }
    UploadFileController.localValidateFile = localValidateFileMock
    uploadFileController = new UploadFileController(options)
    uploadFileController.constructBaseFormData = constructBaseFormDataMock
    // uploadFileController.apiValidateFile = apiValidateFileMock

    vi.mock('axios', async () => {
      const actualAxios = vi.importActual('axios')
      return {
        default: {
          ...actualAxios.default,
          post: vi.fn().mockResolvedValue({ data: { test: 'test' } })
        }
      }
    })

    expect(uploadFileController.apiValidateFile).toBeDefined()

    const params = {
      filePath: 'aHashedFileName.csv',
      originalname: 'test.csv',
      dataset: 'test',
      dataSubject: 'test',
      organization: 'local-authority-eng:CAT',
      mimetype: 'text/csv',
      geomType: 'point',
      sessionId: 'sessionId'
    }

    const result = await uploadFileController.apiValidateFile(params)

    expect(result).toEqual({ test: 'test' })
    expect(constructBaseFormDataMock.mock.calls[0][0].geomType).toEqual('point')
    expect(constructBaseFormDataMock.mock.calls[0][0].sessionId).toEqual('sessionId')
    expect(constructBaseFormDataMock.mock.calls[0][0].dataset).toEqual('test')
    expect(constructBaseFormDataMock.mock.calls[0][0].dataSubject).toEqual('test')

    // expect().toHaveBeenCalledWith(config.api.url + config.api.validationEndpoint, expect.any(FormData))
  })

  describe('validators', () => {
    describe('file extension', () => {
      it('should return true if the file extension is one of the accepted extensions', () => {
        const allowedExtensions = ['csv', 'xls', 'xlsx', 'json', 'geojson', 'gml', 'gpkg']

        for (const extension of allowedExtensions) {
          expect(UploadFileController.extensionIsValid({ originalname: `test.${extension}` })).toEqual(true)
        }
      })

      it('should return false if the file extension is not one of the accepted extensions', () => {
        expect(UploadFileController.extensionIsValid({ originalname: 'test.exe' })).toEqual(false)
      })
    })

    describe('file size', () => {
      it('should return true if the file size is less than the max file size', () => {
        expect(UploadFileController.sizeIsValid({ size: 1000 })).toEqual(true)
      })

      it('should return false if the file size is greater than the max file size', () => {
        expect(UploadFileController.sizeIsValid({ size: 100000000 })).toEqual(false)
      })
    })

    describe('file name length', () => {
      it('should return true if the file name is less than the max file name length', () => {
        expect(UploadFileController.fileNameIsntTooLong({ originalname: 'a'.repeat(100) })).toEqual(true)
      })

      it('should return false if the file name is greater than the max file name length', () => {
        expect(UploadFileController.fileNameIsntTooLong({ originalname: 'a'.repeat(1000) })).toEqual(false)
      })
    })

    describe('file name', () => {
      it('should return true if the file name is valid', () => {
        expect(UploadFileController.fileNameIsValid({ originalname: 'test.csv' })).toEqual(true)
      })

      it('should return false if the file name contains invalid characters', () => {
        expect(UploadFileController.fileNameIsValid({ originalname: 'test.csv?' })).toEqual(false)
      })
    })

    describe('file name double extension', () => {
      it('should return true if the file name does not contain a double extension', () => {
        expect(UploadFileController.fileNameDoesntContainDoubleExtension({ originalname: 'test.csv' })).toEqual(true)
      })

      it('should return false if the file name contains a double extension', () => {
        expect(UploadFileController.fileNameDoesntContainDoubleExtension({ originalname: 'test.csv.csv' })).toEqual(false)
      })
    })
  })
})
