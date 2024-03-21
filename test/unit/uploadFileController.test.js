import { describe, it, expect, vi, beforeEach } from 'vitest'

import UploadFileController from '../../src/controllers/uploadFileController.js'

import publishRequestApi from '../../src/utils/publishRequestAPI.js'

describe('UploadFileController', () => {
  let uploadFileController

  beforeEach(() => {
    vi.mock('fs', async () => {
      return {
        promises: {
          readFile: vi.fn(),
          unlink: vi.fn()
        },
        createReadStream: vi.fn()
      }
    })

    vi.mock('aws-sdk', () => {
      return {
        default: {
          S3: vi.fn().mockReturnValue({
            upload: vi.fn().mockReturnValue({
              promise: vi.fn()
            })
          }),
          config: {
            update: vi.fn()
          }
        }
      }
    })

    vi.spyOn(publishRequestApi, 'postFileRequest')

    vi.mock('../../src/utils/publishRequestAPI.js', () => ({
      postFileRequest: vi.fn().mockResolvedValue('requestId')
    }))

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '1234' })
      })
    )

    uploadFileController = new UploadFileController({
      route: '/upload'
    })
  })

  describe('post', () => {
    it('should not proceed if req.file is undefined', async () => {
      const req = {
        file: undefined
      }
      const res = {}
      const next = vi.fn()

      await uploadFileController.post(req, res, next)

      expect(next).not.toHaveBeenCalled()
    })

    it('should validate the file locally', async () => {
      const req = {
        file: {
          path: 'aHashedFileName.csv',
          originalname: 'conservation_area.csv',
          mimetype: 'text/csv',
          size: 1234
        }
      }
      const res = {}
      const next = vi.fn()

      UploadFileController.localValidateFile = vi.fn().mockReturnValue(true)
      UploadFileController.uploadFileToS3 = vi.fn().mockResolvedValue('uploadedFilename')

      await uploadFileController.post(req, res, next)

      expect(UploadFileController.localValidateFile).toHaveBeenCalledWith({
        ...req.file,
        filePath: req.file.path,
        fileName: req.file.originalname
      })
    })

    it('should upload the file to S3', async () => {
      const req = {
        file: {
          path: 'aHashedFileName.csv',
          originalname: 'conservation_area.csv',
          mimetype: 'text/csv',
          size: 1234
        },
        sessionModel: {
          get: () => 'test',
          set: vi.fn()
        },
        body: {},
        session: {
          id: 'sessionId'
        }
      }
      const res = {}
      const next = vi.fn()

      UploadFileController.localValidateFile = vi.fn().mockReturnValue(true)
      UploadFileController.uploadFileToS3 = vi.fn().mockResolvedValue('uploadedFilename')

      await uploadFileController.post(req, res, next)

      expect(UploadFileController.uploadFileToS3).toHaveBeenCalledWith(req.file)
    })

    it('should post the file request', async () => {
      const req = {
        file: {
          path: 'aHashedFileName.csv',
          originalname: 'conservation_area.csv',
          mimetype: 'text/csv',
          size: 1234
        },
        sessionModel: {
          get: () => 'test',
          set: vi.fn()
        },
        body: {},
        session: {
          id: 'sessionId'
        }
      }
      const res = {}
      const next = vi.fn()

      UploadFileController.localValidateFile = vi.fn().mockReturnValue(true)
      UploadFileController.uploadFileToS3 = vi.fn().mockResolvedValue('uploadedFilename')

      await uploadFileController.post(req, res, next)

      expect(publishRequestApi.postFileRequest).toHaveBeenCalledWith({
        ...uploadFileController.getBaseFormData(req),
        originalFilename: req.file.name,
        uploadedFilename: 'uploadedFilename'
      })
    })

    it('should set the request_id in the body', async () => {
      const req = {
        file: {
          path: 'aHashedFileName.csv',
          originalname: 'conservation_area.csv',
          mimetype: 'text/csv',
          size: 1234
        },
        sessionModel: {
          get: () => 'test',
          set: vi.fn()
        },
        body: {},
        session: {
          id: 'sessionId'
        }
      }
      const res = {}
      const next = vi.fn()

      UploadFileController.localValidateFile = vi.fn().mockReturnValue(true)
      UploadFileController.uploadFileToS3 = vi.fn().mockResolvedValue('uploadedFilename')

      await uploadFileController.post(req, res, next)

      expect(req.body.request_id).toEqual('1234')
    })
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
