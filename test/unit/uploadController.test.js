import { describe, it, expect, beforeEach, vi } from 'vitest'

import UploadController from '../../src/controllers/uploadController.js'
import PageController from '../../src/controllers/pageController.js'

describe('UploadController', () => {
  let uploadController

  beforeEach(() => {
    const options = {
      route: '/upload'
    }
    uploadController = new UploadController(options)
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

  describe('get redirect guard', () => {
    it('redirects to landing page when required values are missing', async () => {
      const req = {
        sessionModel: {
          get: (key) => key === 'deep-link-session-key' ? { orgName: '' } : key === 'dataset' ? 'dataset' : key === 'data-subject' ? 'collection' : undefined
        },
        session: {
          id: 'session-1'
        }
      }
      const res = { redirect: vi.fn() }

      await uploadController.get(req, res, vi.fn())

      expect(res.redirect).toHaveBeenCalledWith('/')
    })

    it('calls parent get when required values are present', async () => {
      const parentGetSpy = vi.spyOn(PageController.prototype, 'get').mockImplementation(() => {})
      const req = {
        sessionModel: {
          get: (key) => key === 'deep-link-session-key' ? { orgName: 'Org' } : key === 'dataset' ? 'dataset' : key === 'data-subject' ? 'collection' : undefined
        },
        session: {
          id: 'session-1'
        }
      }
      const res = { redirect: vi.fn() }

      await uploadController.get(req, res, vi.fn())

      expect(res.redirect).not.toHaveBeenCalled()
      expect(parentGetSpy).toHaveBeenCalledOnce()
      parentGetSpy.mockRestore()
    })
  })
})
