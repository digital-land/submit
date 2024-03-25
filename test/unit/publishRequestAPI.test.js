import { postFileRequest, postUrlRequest, getRequestData, RequestData } from '../../src/utils/publishRequestAPI.js'
import { test, describe, expect, beforeEach, vi } from 'vitest'

describe('publishRequestApi', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'testId' })
      })
    )
  })

  test('postFileRequest', async ({ fetch }) => {
    const formData = {
      uploadedFilename: 'testFile',
      originalFilename: 'originalTestFile',
      dataset: 'testDataset',
      collection: 'testCollection',
      geomType: 'testGeomType'
    }

    const response = await postFileRequest(formData)

    expect(response).toBe('testId')
  })

  test('postUrlRequest', async ({ fetch }) => {
    const formData = {
      url: 'https://test.com',
      dataset: 'testDataset',
      collection: 'testCollection',
      geomType: 'testGeomType'
    }

    const response = await postUrlRequest(formData)

    expect(response).toBe('testId')
  })

  test('getRequestData', async () => {
    const resultId = 'testId'

    const mockFetchResponse = {
      id: 'testId',
      data: {
        response: {
          'error-summary': []
        }
      },
      status: 'COMPLETE'
    }
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFetchResponse)
      })
    )

    const requestData = await getRequestData(resultId)

    expect(requestData).toBeInstanceOf(RequestData)
    expect(requestData.hasErrors()).toBe(false)
    expect(requestData.isComplete()).toBe(true)
  })
})
